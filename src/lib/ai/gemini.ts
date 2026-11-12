import "server-only";
import { UserError } from "@/lib/errors";

/** Minimal Gemini REST client (no SDK). The API key only ever lives in the server environment. */

const API = "https://generativelanguage.googleapis.com/v1beta/models";

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function models() {
  const list = (process.env.GEMINI_MODELS ?? "gemini-flash-lite-latest,gemini-flash-latest")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return list.length ? list : ["gemini-flash-latest"];
}

/** Subset of the Gemini response-schema format. */
export type GSchema =
  | { type: "STRING"; description?: string; enum?: string[] }
  | { type: "BOOLEAN" | "INTEGER" | "NUMBER"; description?: string }
  | { type: "ARRAY"; items: GSchema; description?: string }
  | { type: "OBJECT"; properties: Record<string, GSchema>; required?: string[]; description?: string };

type Args = { system: string; prompt: string; schema: GSchema; temperature?: number };

async function callModel(model: string, key: string, { system, prompt, schema, temperature }: Args) {
  const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: temperature ?? 0.7, maxOutputTokens: 8192 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500 || res.status === 404;
    return { ok: false as const, retryable, status: res.status };
  }
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const text = (json.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  if (!text.trim()) return { ok: false as const, retryable: true, status: 200 };
  return { ok: true as const, text };
}

/** Calls the configured models in order (with one retry each on transient errors) and returns parsed JSON. */
export async function generateJson<T>(args: Args): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new UserError("AI is not configured. Add GEMINI_API_KEY to the server environment.");
  let lastStatus = 0;
  for (const model of models()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await callModel(model, key, args);
        if (r.ok) {
          try {
            return JSON.parse(r.text) as T;
          } catch {
            lastStatus = 422;
            break; // malformed JSON: try the next model
          }
        }
        lastStatus = r.status;
        if (r.status === 400 || r.status === 401 || r.status === 403) {
          throw new UserError(r.status === 400 ? "The AI request was rejected. Try a shorter brief." : "The AI key was rejected. Check GEMINI_API_KEY on the server.");
        }
        if (!r.retryable) break;
        if (r.status === 404) break; // unknown model name: go to next model
        await new Promise((ok) => setTimeout(ok, 800));
      } catch (err) {
        if (err instanceof UserError) throw err;
        lastStatus = 0; // network / timeout
      }
    }
  }
  console.error("[gemini] all models failed, last status", lastStatus);
  throw new UserError(lastStatus === 429 ? "The AI service is rate-limited right now. Wait a minute and try again." : "The AI service is busy or unavailable. Please try again in a moment.");
}
