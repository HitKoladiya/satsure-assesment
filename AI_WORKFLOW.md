# AI Development Workflow Log

## Tools Used

- **Claude Code (claude-sonnet-4-6 / claude-opus-4-7)** — primary engineering agent. Drove the entire implementation: architecture planning, all file generation, curl verification, build checks, and edge-case testing. Used within a structured spec → task-checklist workflow.
- **Google Gemini (`gemini-3.1-flash-lite-preview`)** — the runtime AI model powering Q&A, draft generation, and self-correction inside the app itself.

---

## How AI Sped Up Development

**Spec-driven scaffolding.** Before writing a line of application code, Claude generated `spec.md` (architecture, data contracts, API shapes, edge-case matrix) and `tasks.md` (10 phases, each independently committable with manual verification steps). This meant every implementation decision was made upfront — the actual coding phase had zero ambiguity about file names, function signatures, or HTTP codes.

**Parallel file generation.** All five `lib/` files (`errors.ts`, `prompts.ts`, `gemini.ts`, `extractText.ts`, `validation.ts`) were written in a single turn. Without AI, each would have required separate research, boilerplate, and review passes.

**Live verification loop.** Instead of "write then manually test later," each phase ended with Claude starting the dev server, running targeted `curl` checks against the real endpoints, parsing the JSON response, and reporting pass/fail — all within the same turn. This caught the `request.formData()` 500 bug (Phase 3) and the Gemini rate-limit issue (Phase 5) immediately.

---

## Prompts and Workflows Reused

- `prompts/system.md` — used by both `/api/qa` and `/api/summary` as the system instruction. One file, two endpoints.
- `prompts/summary.md` — the structured summary task. Reused verbatim in the draft step of the pipeline.
- `rules/response_rules.md` — used as the validation reference in the retry self-correction prompt. The same rules that the LLM must satisfy are the rules fed back to it when it fails.
- The `tasks.md` checklist format (phase → bite-sized tasks → verify block → commit message) was reused for all 10 phases without modification.
