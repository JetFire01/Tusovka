const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiSchema {
  type: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  description?: string;
  enum?: string[];
}

export interface GeminiCallOptions {
  prompt: string;
  responseSchema?: GeminiSchema;
  temperature?: number;
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callGemini({
  prompt,
  responseSchema,
  temperature = 0.4,
}: GeminiCallOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY не настроен", 500);
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      ...(responseSchema && {
        responseMimeType: "application/json",
        responseSchema,
      }),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API error ${res.status}: ${text.slice(0, 500)}`, 502);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || "")
    .join("");
  if (!text) {
    throw new GeminiError("Gemini вернул пустой ответ", 502);
  }
  return text;
}
