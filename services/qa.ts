import { generateText } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import type { QaResponse } from "@/types";

const NOT_FOUND_SENTINEL = "I cannot find this information in the uploaded document.";

export async function answerQuestion({
  text,
  question,
}: {
  text: string;
  question: string;
}): Promise<QaResponse> {
  const system = await loadPrompt("system");
  const prompt = `Document text:\n\n${text}\n\n---\n\nUser question: ${question}`;
  const answer = await generateText({ system, prompt });
  const grounded = !answer.includes(NOT_FOUND_SENTINEL);
  return { answer: answer.trim(), grounded };
}
