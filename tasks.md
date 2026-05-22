# Execution Checklist — Mini AI Workspace Assistant

> For the engineering agent. Work top to bottom. Tick `[x]` as each item completes. **Each phase ends in exactly one commit** (the message is given) so the history reads as a clear thinking process. After each phase, run the **Verify** block before committing. Read `spec.md` for the contracts referenced here. No test framework — verification is manual.
>
> Stack reminders: Next 16 App Router, React 19, TS strict (no `any`), Tailwind v4, `@google/genai` model `gemini-3.1-flash-lite-preview`, alias `@/*` → repo root. Route handlers: `export const runtime = "nodejs"` + Web `Request`/`Response`. Package manager: `pnpm`.

---

## Phase 0 — Project setup & dependencies

- [ ] Add runtime deps: `pnpm add @google/genai unpdf zod`.
- [ ] Confirm `zod` now appears in `package.json` `dependencies` (was transitive).
- [ ] Copy env: ensure `.env` exists locally with a real `GEMINI_API_KEY` (`.env.example` already documents it). Do **not** commit `.env`.
- [ ] Confirm `.gitignore` ignores `.env` (create/append `.env` if missing).

**Verify**
- [ ] `pnpm dev` boots with no errors; `http://localhost:3000` serves the default page.
- [ ] `node -e "require('unpdf'); require('@google/genai'); require('zod')"` exits 0.

**Commit:** `chore: add gemini, unpdf, and zod dependencies`

---

## Phase 1 — Shared types

- [ ] Create `types/index.ts` with every interface/type from `spec.md` §7: `PromptName`, `SupportedFileType`, `UploadResult`, `ChatMessage`, `QaResponse`, `SummarySections`, `StepName`, `StepStatus`, `PipelineStep`, `SummaryResult`, `ApiError`.
- [ ] Export all as named exports. No `any`.

**Verify**
- [ ] `pnpm exec tsc --noEmit` passes.

**Commit:** `feat(types): add shared data contracts`

---

## Phase 2 — Backend utilities (`lib/`)

- [ ] `lib/errors.ts`: `AppError extends Error` with `status: number` + `code: string`; `toErrorResponse(err)` → `Response.json({ error: { code, message } }, { status })`. Unknown errors map to 500 `INTERNAL_ERROR` with a generic message (no stack leak).
- [ ] `lib/prompts.ts`: implement `loadPrompt(name: PromptName)` exactly as in `spec.md` §5 (read from `process.cwd()`, in-process `Map` cache).
- [ ] `lib/gemini.ts`:
  - [ ] Read `process.env.GEMINI_API_KEY`; if absent throw `AppError(500, "MISSING_API_KEY", …)`.
  - [ ] Construct `new GoogleGenAI({ apiKey })`; export const `GEMINI_MODEL = "gemini-3.1-flash-lite-preview"`.
  - [ ] `generateText({ system, prompt }): Promise<string>` — single `models.generateContent` call; wrap failures as `AppError(502, "LLM_ERROR", …)`.
- [ ] `lib/extractText.ts`:
  - [ ] `MAX_FILE_BYTES`, `MAX_INPUT_CHARS` constants.
  - [ ] `detectType(filename, mime): SupportedFileType` → throw `AppError(415, "UNSUPPORTED_FILE_TYPE")` if not txt/md/pdf.
  - [ ] `extractTextFromFile(file: File)`: enforce size (413 `FILE_TOO_LARGE`); txt/md via `new TextDecoder().decode(bytes)`; pdf via `unpdf` `extractText` (join pages). Empty result → `AppError(422, "NO_TEXT_EXTRACTED")`. Truncate to `MAX_INPUT_CHARS`, return `{ filename, text, charCount, truncated }`.
- [ ] `lib/validation.ts`:
  - [ ] `qaRequestSchema` = `z.object({ text: z.string().min(1), question: z.string().min(1) })`; `summaryRequestSchema` = `z.object({ text: z.string().min(1) })`.
  - [ ] `REQUIRED_HEADERS = ["### Executive Summary", "### Key Insights", "### Action Items"]`.
  - [ ] `checkRequiredHeaders(raw): { valid: boolean; missing: string[] }`.
  - [ ] `parseSummarySections(raw): SummarySections` — slice text between headers; parse insights/action-items list items (`- `, `* `, `1. `).

**Verify**
- [ ] `pnpm exec tsc --noEmit` passes.
- [ ] Throwaway check: `node --input-type=module -e "import('./lib/extractText.ts')"` is not valid TS at runtime — instead verify via a temporary route in a later phase, or `console.log(checkRequiredHeaders("### Executive Summary\n### Key Insights\n### Action Items"))` returns `valid:true` using a scratch `.mjs` that you delete.

**Commit:** `feat(lib): add prompt loader, gemini client, text extraction, validation`

---

## Phase 3 — Upload endpoint

- [ ] `app/api/upload/route.ts`: `runtime = "nodejs"`; `POST(request)` → `request.formData()`, read `file`. Missing → 400 `NO_FILE`. Call `extractTextFromFile`. Return `UploadResult` as JSON. Wrap all errors with `toErrorResponse`.

**Verify** (dev server running)
- [ ] `.txt`: `curl -F "file=@sample.txt" localhost:3000/api/upload` → 200 with `text` + `charCount`.
- [ ] `.md` and a real `.pdf`: same, returns extracted text.
- [ ] Unsupported (e.g. `sample.zip`): 415 `UNSUPPORTED_FILE_TYPE`.
- [ ] No file field: 400 `NO_FILE`.
- [ ] (If available) a > 5 MB file: 413 `FILE_TOO_LARGE`.

**Commit:** `feat(api): add file upload and text extraction endpoint`

---

## Phase 4 — Q&A endpoint & service

- [ ] `services/qa.ts`: `answerQuestion({ text, question })` — load `system.md`, build a prompt that pins the model to the document text only, call `generateText`. Detect the system prompt's "cannot find this information" sentinel → set `grounded: false`. Return `QaResponse`.
- [ ] `app/api/qa/route.ts`: `runtime = "nodejs"`; validate body with `qaRequestSchema` (invalid → 400 `INVALID_REQUEST`); call `answerQuestion`; return JSON; errors via `toErrorResponse`.

**Verify**
- [ ] `curl -s -X POST localhost:3000/api/qa -H 'content-type: application/json' -d '{"text":"The project deadline is March 5. Budget is $10k.","question":"What is the budget?"}'` → answer mentions `$10k`, `grounded:true`.
- [ ] Ask something absent ("Who is the CEO?") → "cannot find this information" answer, `grounded:false`.
- [ ] Empty body → 400 `INVALID_REQUEST`.

**Commit:** `feat(api): add grounded Q&A endpoint`

---

## Phase 5 — Summary pipeline (Draft → Validate → Retry)

- [ ] `services/summaryPipeline.ts`: implement `runSummaryPipeline(text): Promise<SummaryResult>` per `spec.md` §8 — `MAX_ATTEMPTS = 2`, draft step, deterministic `checkRequiredHeaders`, LLM self-correction loop feeding `response_rules.md` + broken draft, `finalize` via `parseSummarySections`. Time each step into `steps[]`. Never throw on format failure (return `valid:false` + best-effort).
- [ ] `app/api/summary/route.ts`: `runtime = "nodejs"`; validate with `summaryRequestSchema`; call `runSummaryPipeline`; return `SummaryResult`; infra errors via `toErrorResponse`.

**Verify**
- [ ] Happy path: POST a few paragraphs → 200, `valid:true`, `sections` populated, `steps` shows `draft` + `validate` success.
- [ ] Retry path: temporarily hardcode the draft to omit `### Action Items` (or stub `generateText` to return a header-less string on attempt 1), confirm a `retry` step appears and validation recovers; **revert the stub before committing**.
- [ ] Confirm `steps[]` is present in the response JSON (UI will render it next).

**Commit:** `feat(ai): add draft-validate-retry summary pipeline`

---

## Phase 6 — UI shell, state, upload

- [ ] `app/layout.tsx`: update `metadata.title`/`description` to the app; keep fonts; ensure full-height body.
- [ ] `app/page.tsx`: Server Component rendering `<Workspace />` inside semantic `<main>`.
- [ ] `components/Workspace.tsx` (`"use client"`): `useReducer` with `WorkspaceState`/`WorkspaceAction` from `spec.md` §9; `handleUpload` → POST `/api/upload`; render layout regions.
- [ ] `components/UploadDropzone.tsx`: labeled file input + drag-drop; client pre-check (type + ≤5MB) before sending; disabled while `status === "uploading"`.
- [ ] `components/ErrorBanner.tsx`: dismissible; shows `state.error`.
- [ ] Tailwind: neutral palette, `rounded-xl`, soft shadows; class order layout→spacing→typography→colors→effects.

**Verify**
- [ ] Upload a `.pdf` in the browser → filename + char count shown; reducer holds `document`.
- [ ] Upload a `.zip` → friendly error banner, no crash.
- [ ] Keyboard: file input reachable and operable via keyboard.

**Commit:** `feat(ui): add workspace shell, state, and file upload`

---

## Phase 7 — Q&A panel, summary dashboard, step logs

- [ ] `components/ChatPanel.tsx`: transcript from `messages[]`; labeled question input; Enter submits; disabled until a document is loaded and while `status === "asking"`. On submit → POST `/api/qa`, append user + assistant messages; show `grounded:false` answers with a subtle "not found in document" tag.
- [ ] `components/SummaryDashboard.tsx`: "Generate summary" button (disabled until document loaded / while summarizing) → POST `/api/summary`; render `sections` as three cards (Executive Summary text, Key Insights bullets, Action Items checklist).
- [ ] `components/StepLogTimeline.tsx`: render `summary.steps[]` — per step show name, status icon (running/success/warning/failed), attempt, message, `durationMs`.
- [ ] Wire `summary.valid === false` → warning banner ("Showing best-effort summary; format validation did not fully pass.").

**Verify**
- [ ] End-to-end: upload → ask 2 questions (one answerable, one not) → generate summary; three cards render; step timeline shows draft + validate.
- [ ] Trigger the retry path again (temporary stub) and watch a `retry` step render live, then revert.
- [ ] Buttons/inputs all have accessible labels; tab order is sane.

**Commit:** `feat(ui): add Q&A panel, summary dashboard, and step-log timeline`

---

## Phase 8 — Edge cases & graceful degradation

- [ ] Walk every row of `spec.md` §11 and confirm the wired behavior:
  - [ ] Scanned/empty PDF → 422 banner "No selectable text found…".
  - [ ] Missing `GEMINI_API_KEY` (temporarily unset, restart) → 500 `MISSING_API_KEY` banner, no stack leak. Restore key.
  - [ ] Gemini failure (temporarily use a bad key) → 502 `LLM_ERROR` banner with Retry affordance. Restore key.
  - [ ] Q&A before upload → input disabled.
  - [ ] Oversized document → `truncated:true` notice shown.
  - [ ] Summary invalid after retries → warning banner + best-effort cards (no crash).
- [ ] Confirm loading states for all three actions and empty states (no document, empty transcript) are explicit.

**Verify**
- [ ] Each bullet above reproduced once in the browser; no unhandled console errors.

**Commit:** `feat(ux): handle upload, LLM, and validation edge cases`

---

## Phase 9 — Documentation deliverables

- [ ] `README.md`: project intro; **Setup** (`pnpm install`, copy `.env.example`→`.env`, add `GEMINI_API_KEY`, `pnpm dev`); **Architecture overview** (link `spec.md`, the request lifecycle, lib/services/components split); **Design decisions** (stateless server, unpdf choice, parsed-cards over markdown renderer, Draft→Validate→Retry rationale); how to use the app.
- [ ] `AI_WORKFLOW.md` (one page, honest + specific): which AI tools were used; specific dev speedups (e.g. spec-driven scaffolding of the pipeline); prompts/workflows reused (`prompts/`, `rules/`, this checklist); AI-generated code modified manually and why; one thing AI got wrong and how it was caught (e.g. a dropped header caught by `checkRequiredHeaders`).
- [ ] Confirm `.env.example` is accurate and committed.

**Verify**
- [ ] A fresh reader can follow `README.md` setup from clone to running app.
- [ ] `AI_WORKFLOW.md` reads as genuine and specific, not generic.
- [ ] `pnpm build` succeeds; `pnpm exec tsc --noEmit` passes; `pnpm lint` is clean.

**Commit:** `docs: add README and AI_WORKFLOW`

---

## Final acceptance checklist

- [ ] App runs end-to-end: upload → grounded Q&A → validated structured summary with visible step logs.
- [ ] All prompts/rules read from `prompts/*.md` + `rules/response_rules.md` at runtime; none hardcoded.
- [ ] Multi-step Draft → Validate → Retry flow is observable in the UI.
- [ ] No `any`; strict TS passes; lint clean; build succeeds.
- [ ] `.env` never committed; `.env.example` present.
- [ ] Commit history is incremental and reads as a clear thought process (Phases 0–9).
