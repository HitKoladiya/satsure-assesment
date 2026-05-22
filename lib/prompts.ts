import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PromptName } from "@/types";

const FILES: Record<PromptName, string> = {
  system: "prompts/system.md",
  summary: "prompts/summary.md",
  responseRules: "rules/response_rules.md",
};

const cache = new Map<PromptName, string>();

export async function loadPrompt(name: PromptName): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const text = await readFile(join(process.cwd(), FILES[name]), "utf8");
  cache.set(name, text);
  return text;
}
