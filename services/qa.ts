import { generateText } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import type { QaResponse, QaTurn } from "@/types";

const NOT_FOUND_SENTINEL = "I cannot find this information in the uploaded document.";

// Server-side safety cap (= 5 exchanges). The client already trims to the last 5;
// this guards against an oversized payload so token cost can't blow up.
const MAX_HISTORY_TURNS = 10;

export async function answerQuestion({
  text,
  question,
  history = [],
}: {
  text: string;
  question: string;
  history?: QaTurn[];
}): Promise<QaResponse> {
  const system = await loadPrompt("system");

  const conversation = history
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n");

  const prompt = [
    `Document text:\n\n${text}`,
    conversation && `Conversation so far:\n${conversation}`,
    `User question: ${question}`,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const answer = await generateText({ system, prompt });
  const grounded = !answer.includes(NOT_FOUND_SENTINEL);
  return { answer: answer.trim(), grounded };
}
