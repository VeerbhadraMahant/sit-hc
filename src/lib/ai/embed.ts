import "server-only";
import { EMBED_DIM, EMBED_MODEL, gemini, withRetry } from "./gemini";

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function normalize(v: number[]) {
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/** Embeds up to 100 texts per call. Returns unit vectors of EMBED_DIM length. */
export async function embedTexts(texts: string[], taskType: TaskType = "RETRIEVAL_DOCUMENT"): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const res = await withRetry(() =>
      gemini().models.embedContent({
        model: EMBED_MODEL,
        contents: batch,
        config: { taskType, outputDimensionality: EMBED_DIM },
      }),
    );
    for (const e of res.embeddings ?? []) out.push(normalize(e.values ?? []));
  }
  if (out.length !== texts.length) throw new Error("Embedding count mismatch");
  return out;
}

export async function embedText(text: string, taskType: TaskType = "RETRIEVAL_DOCUMENT") {
  const [v] = await embedTexts([text], taskType);
  return v;
}

/** pgvector literal accepted by PostgREST. */
export const toPgVector = (v: number[]) => `[${v.join(",")}]`;
