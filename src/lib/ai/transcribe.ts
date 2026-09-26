import "server-only";
import { generateStructured } from "./gemini";
import { TranscriptSchema, type Transcript } from "./schemas";

const SYSTEM = `You transcribe short workplace voice notes from employees.
Return the verbatim transcript in the language that was spoken (do not translate). Remove filler sounds like "um" and "uh" but keep every substantive word.
If the audio is silent or unintelligible, return an empty transcript.`;

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<Transcript> {
  return generateStructured({
    schema: TranscriptSchema,
    system: SYSTEM,
    temperature: 0,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mimeType.split(";")[0], data: audio.toString("base64") } },
          { text: "Transcribe this employee voice note." },
        ],
      },
    ],
  });
}
