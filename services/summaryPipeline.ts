import { generateText } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import { checkRequiredHeaders, parseSummarySections } from "@/lib/validation";
import type { PipelineStep, SummaryResult } from "@/types";

const MAX_ATTEMPTS = 2;

export async function runSummaryPipeline(text: string): Promise<SummaryResult> {
  const steps: PipelineStep[] = [];
  let raw = "";
  let valid = false;
  let correctionAttempts = 0;

  // Step 1: Draft — load prompts in parallel, generate initial output
  const draftStart = Date.now();
  const [system, summaryPrompt, rules] = await Promise.all([
    loadPrompt("system"),
    loadPrompt("summary"),
    loadPrompt("responseRules"),
  ]);
  raw = await generateText({
    system,
    prompt: [
      summaryPrompt,
      "Output rules:",
      rules,
      `Document text:\n\n${text}`,
    ].join("\n\n"),
  });
  steps.push({
    name: "draft",
    status: "success",
    attempt: 1,
    message: `Draft generated (${raw.length} chars).`,
    durationMs: Date.now() - draftStart,
  });

  // Step 2: Validate — deterministic header check (zero token cost)
  const validateStart = Date.now();
  const check = checkRequiredHeaders(raw);
  valid = check.valid;
  steps.push({
    name: "validate",
    status: valid ? "success" : "warning",
    attempt: 1,
    message: valid
      ? "All required headers present."
      : `Missing headers: ${check.missing.join(", ")}`,
    durationMs: Date.now() - validateStart,
  });

  // Step 3: Retry — LLM self-correction when headers are missing
  while (!valid && correctionAttempts < MAX_ATTEMPTS) {
    correctionAttempts++;
    const retryStart = Date.now();

    try {
      const correctedRaw = await generateText({
        system,
        prompt: [
          "The summary below failed format validation. It is missing required markdown headers.",
          "",
          "Validation rules:",
          rules,
          "",
          "Broken draft:",
          raw,
          "",
          "Return only the corrected summary with all required headers. Do not add any explanation.",
        ].join("\n"),
      });

      raw = correctedRaw;
      const recheck = checkRequiredHeaders(raw);
      valid = recheck.valid;

      const isLastAttempt = correctionAttempts >= MAX_ATTEMPTS;
      steps.push({
        name: "retry",
        status: valid ? "success" : isLastAttempt ? "failed" : "warning",
        attempt: correctionAttempts,
        message: valid
          ? `Self-correction succeeded on attempt ${correctionAttempts}.`
          : `Still missing: ${recheck.missing.join(", ")}`,
        durationMs: Date.now() - retryStart,
      });
    } catch (_err) {
      const msg =
        _err instanceof Error ? _err.message : "Self-correction call failed.";
      steps.push({
        name: "retry",
        status: "failed",
        attempt: correctionAttempts,
        message: msg,
        durationMs: Date.now() - retryStart,
      });
      break;
    }
  }

  // Step 4: Finalize — parse sections regardless of validity
  const finalizeStart = Date.now();
  const sections = parseSummarySections(raw);
  steps.push({
    name: "finalize",
    status: valid ? "success" : "warning",
    attempt: 1,
    message: valid
      ? "Summary validated and parsed."
      : "Showing best-effort output; format validation did not fully pass.",
    durationMs: Date.now() - finalizeStart,
  });

  return { raw, sections, valid, steps };
}
