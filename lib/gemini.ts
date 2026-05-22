import { GoogleGenAI } from "@google/genai";
import { AppError } from "@/lib/errors";

export const GEMINI_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      500,
      "MISSING_API_KEY",
      "GEMINI_API_KEY is not set. Add it to your .env file.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface GenerateTextParams {
  system: string;
  prompt: string;
}

export async function generateText({ system, prompt }: GenerateTextParams): Promise<string> {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { systemInstruction: system },
    });
    const text = response.text;
    if (!text || !text.trim()) {
      throw new AppError(502, "LLM_ERROR", "The model returned an empty response.");
    }
    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, "LLM_ERROR", "The AI request failed. Please try again.");
  }
}
