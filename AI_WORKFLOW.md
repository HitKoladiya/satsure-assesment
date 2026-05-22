# AI Development Workflow Log

## Tools Used

- **Claude Code (claude-sonnet-4-6 / claude-opus-4-7)** — primary engineering agent. Drove the entire implementation: architecture planning, all file generation, curl verification, build checks, and edge-case testing. Used within a structured spec → task-checklist workflow.

- **Spec -> Plan -> Task** using powerful Opus for architecture and planning, then Sonnet for code generation and verification. The two models complemented each other: Opus excelled at high-level design and complex reasoning, while Sonnet was more consistent at following instructions for code scaffolding.

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

---

## Code I Modified Manually (and Why)

- **Swapped the Gemini model ID.** The initial scaffold wired up an older Gemini model that the API no longer served. I replaced it with the current `gemini-3.1-flash-lite-preview` and promoted it to a `GEMINI_MODEL` env var so it can be swapped without touching code (`lib/gemini.ts`).
- **Added a temperature control.** The generated client made a flat `generateContent` call with no sampling config. I added a `temperature` parameter (default `0.2`) because the whole app is built on zero-hallucination grounding — a low, near-deterministic temperature reduces format drift in the summary pipeline and keeps Q&A anchored to the document.
- **Threaded prior conversation into Q&A.** The first cut sent only `{ text, question }`, so each question was answered in isolation. I added a capped history field (`MAX_HISTORY_TURNS`) that the client sends with every question, so follow-ups like "rewrite that" or "expand the last point" resolve against the real conversation.
- **Frontmatter-stripped the prompt loader.** After versioning the prompt files, I made `loadPrompt` strip the YAML frontmatter so version metadata never leaks into the model context.
- **Moved the format rules into the draft prompt, not just the retry.** The scaffold only injected `rules/response_rules.md` (which holds the exact `### ` header spec the validator checks) during self-correction — so the first draft was graded against a format it had never been shown, the main cause of avoidable retries. I now load the rules once upfront and include them in the draft, so the model knows the exact format on attempt one and the retry becomes a rare safety net.

---

## What AI Got Wrong (and How I Caught It)

The biggest miss was the **model name**: the AI confidently scaffolded `lib/gemini.ts` with an outdated Gemini model string. `tsc` and lint all passed — it was a runtime-only failure. I caught it the moment I ran the first live call against the real endpoint, which returned a model error instead of text. The fix had two parts: update to the current model, and make the model name an env var so a future rename is a config change, not a code change.

Lesson: AI-generated code that *compiles* still has to be exercised against the real dependency.
