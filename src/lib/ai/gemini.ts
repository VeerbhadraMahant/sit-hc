import "server-only";
import { GoogleGenAI, ThinkingLevel, type ContentListUnion, type GenerateContentParameters } from "@google/genai";
import type { z } from "zod";
import { toGeminiSchema } from "./schemas";

export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
/** Tried in order when the primary model is overloaded (503) or rate-limited. */
const FALLBACK_MODELS = [MODEL, "gemini-3-flash-preview", "gemini-flash-lite-latest"].filter(
  (m, i, all) => all.indexOf(m) === i,
);
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
export const EMBED_DIM = 768;

let client: GoogleGenAI | null = null;

export function gemini() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err);
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 500 || status === 503 || /429|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|fetch failed/i.test(msg);
}

/** Retries rate-limit / transient errors with exponential backoff (free tier friendly). */
export async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === tries - 1) break;
      await sleep(1500 * 2 ** i + Math.random() * 500);
    }
  }
  throw lastErr;
}

/** Structured-output call: Gemini is constrained to the JSON schema, then validated with zod. */
export async function generateStructured<S extends z.ZodType>({
  schema,
  contents,
  system,
  temperature = 0.2,
  thinking = "low",
}: {
  schema: S;
  contents: ContentListUnion;
  system: string;
  temperature?: number;
  thinking?: Thinking;
}): Promise<z.infer<S>> {
  const jsonSchema = toGeminiSchema(schema);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await generateWithFallback(
      {
        contents,
        config: {
          systemInstruction: system,
          temperature,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      },
      thinking,
    );
    try {
      return schema.parse(JSON.parse(res.text ?? ""));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Model returned invalid JSON: ${String(lastErr)}`);
}

/**
 * "low" = ThinkingLevel.LOW — the one setting every model in FALLBACK_MODELS accepts
 * (MINIMAL and thinkingBudget:0 are each rejected by one of them). On gemini-flash-latest
 * it removes thinking entirely and roughly halves latency. "default" = model default.
 */
export type Thinking = "low" | "default";

function withThinking(params: Omit<GenerateContentParameters, "model">, thinking: Thinking) {
  if (thinking === "default") return params;
  return { ...params, config: { ...params.config, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } };
}

const isUnsupportedThinking = (err: unknown) =>
  (err as { status?: number })?.status === 400 && /thinking/i.test(String((err as Error)?.message));

/** generateContent that walks FALLBACK_MODELS when a model is overloaded. */
export async function generateWithFallback(params: Omit<GenerateContentParameters, "model">, thinking: Thinking = "low") {
  let lastErr: unknown;
  for (const model of FALLBACK_MODELS) {
    try {
      return await withRetry(() => gemini().models.generateContent({ ...withThinking(params, thinking), model }), 2);
    } catch (err) {
      lastErr = err;
      if (isUnsupportedThinking(err)) {
        try {
          return await withRetry(() => gemini().models.generateContent({ ...params, model }), 2);
        } catch (retryErr) {
          lastErr = retryErr;
        }
      } else if (!isRetryable(err)) throw err;
    }
  }
  throw lastErr;
}

/** Streaming variant (first model that accepts the request wins; no mid-stream fallback). */
export async function generateStreamWithFallback(
  params: Omit<GenerateContentParameters, "model">,
  thinking: Thinking = "low",
) {
  let lastErr: unknown;
  for (const model of FALLBACK_MODELS) {
    try {
      return await withRetry(() => gemini().models.generateContentStream({ ...withThinking(params, thinking), model }), 2);
    } catch (err) {
      lastErr = err;
      if (isUnsupportedThinking(err)) {
        try {
          return await gemini().models.generateContentStream({ ...params, model });
        } catch (retryErr) {
          lastErr = retryErr;
        }
      } else if (!isRetryable(err)) throw err;
    }
  }
  throw lastErr;
}
