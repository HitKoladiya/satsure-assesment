import { z } from "zod";
import type { SummarySections } from "@/types";

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const qaRequestSchema = z.object({
  text: z.string().min(1),
  question: z.string().min(1),
  history: z.array(chatTurnSchema).optional(),
});

export const summaryRequestSchema = z.object({
  text: z.string().min(1),
});

export const REQUIRED_HEADERS = [
  "### Executive Summary",
  "### Key Insights",
  "### Action Items",
] as const;

export function checkRequiredHeaders(raw: string): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_HEADERS.filter((header) => !raw.includes(header));
  return { valid: missing.length === 0, missing: [...missing] };
}

export function parseSummarySections(raw: string): SummarySections {
  const executiveSummary = sliceSection(raw, "### Executive Summary", "### Key Insights");
  const keyInsights = sliceSection(raw, "### Key Insights", "### Action Items");
  const actionItems = sliceSection(raw, "### Action Items", null);

  return {
    executiveSummary: executiveSummary.trim(),
    keyInsights: toListItems(keyInsights),
    actionItems: toListItems(actionItems),
  };
}

function sliceSection(raw: string, start: string, end: string | null): string {
  const startIdx = raw.indexOf(start);
  if (startIdx === -1) return "";
  const from = startIdx + start.length;
  const endIdx = end ? raw.indexOf(end, from) : -1;
  return raw.slice(from, endIdx === -1 ? undefined : endIdx);
}

export function toListItems(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^([-*]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+\.)\s+/, "").trim())
    .filter(Boolean);
}
