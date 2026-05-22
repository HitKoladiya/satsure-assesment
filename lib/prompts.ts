import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PromptName } from "@/types";

const FILES: Record<PromptName, string> = {
  system: "prompts/system.md",
  summary: "prompts/summary.md",
  responseRules: "rules/response_rules.md",
};

const cache = new Map<PromptName, string>();

// Drop the leading YAML frontmatter (version metadata) so it never reaches the model.
function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trimStart();
}

export async function loadPrompt(name: PromptName): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const raw = await readFile(join(process.cwd(), FILES[name]), "utf8");
  const text = stripFrontmatter(raw);
  cache.set(name, text);
  return text;
}
