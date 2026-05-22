# Technical Specification — Mini AI Workspace Assistant

> Engineering spec for an automated coding agent. Every section is concrete and executable: real file paths, function signatures, HTTP codes, and JSON shapes. No placeholders. Pair this with `tasks.md` for the step-by-step build order.

---

## 1. Overview & Goals

A lightweight web tool where a user uploads a `.txt`, `.md`, or `.pdf` file and then:

1. **Asks questions** about the document (context-aware Q&A, grounded strictly in the extracted text).
2. **Generates a structured brief** — Executive Summary, Key Insights, Action Items — produced through a **multi-step Draft → Validate → Retry** AI flow that self-corrects format/grounding failures before display.

The build is graded on six equally-weighted areas; each goal below maps to one:

| Goal | Assessment area |
| --- | --- |
| One logical, purposeful multi-step flow (Draft → Validate → Retry) | AI Workflow Design |
| Prompts/rules live in standalone, readable `.md` files loaded at runtime | Prompt / Rule Organisation |
| App actually runs; code is maintainable and typed | Practical Engineering |
| Honest, specific `AI_WORKFLOW.md` | AI Productivity Thinking |
| No over-engineering; smallest solution that satisfies requirements | Simplicity & Clarity |
| Clear `README.md` + this spec | Communication |

**Non-negotiable principle:** simplicity beats complexity. Do not add a dependency, abstraction, or feature this spec does not call for.

---

## 2. Tech Stack & Constitution Constraints

- **Next.js 16** App Router, **React 19**, **TypeScript** (strict), **Tailwind CSS v4**.
- **Server Components by default.** Add `"use client"` only where state, browser APIs, or event handlers are required — that is exactly one subtree: `components/Workspace.tsx` and its children.
- **AI:** official Google Gen AI SDK `@google/genai`, model **`gemini-3.1-flash-lite-preview`**. API key read **only on the backend** via `process.env.GEMINI_API_KEY`. Never imported into a client component.
- **No `any`.** All shapes are declared in `types/index.ts` and imported. Strict mode stays on.
- **Folder ownership (constitution):** API utilities in `lib/`, business logic in `services/`, shared UI in `components/`, shared types in `types/`. Route handlers in `app/api/`.
- **Path alias:** `@/*` → repo root (e.g. `import { loadPrompt } from "@/lib/prompts"`).
- **No DB, no auth, no persistence.** The server is stateless; session state lives in the client.

### Dependencies to add

| Package | Why | Notes |
| --- | --- | --- |
| `@google/genai` | Mandated Gemini SDK | backend only |
| `unpdf` | PDF → raw text; lightweight, serverless-friendly, no native binaries | chosen over `pdf-parse` (flaky test-file bug) and `pdfjs-dist` (heavier) |
| `zod` | Validate API request bodies + LLM JSON output | already present transitively at `4.4.3`; promote to a direct dependency |

No test framework is added (per project decision — verification is manual; see `tasks.md`).

---

## 3. Architecture & Request Lifecycle

The server holds nothing between requests. The browser keeps the extracted document text and replays it as context on each call.

```
┌─────────────────────────── Browser (client state: useReducer) ───────────────────────────┐
│  document.text  │  messages[]  │  summary.sections  │  pipeline steps[]  │  status/error  │
└───────┬──────────────────┬───────────────────────────────┬───────────────────────────────┘
        │ file             │ { text, question }             │ { text }
        ▼                  ▼                                ▼
  POST /api/upload    POST /api/qa                    POST /api/summary
        │                  │                                │
  lib/extractText     services/qa                     services/summaryPipeline
   (unpdf/decode)   (system.md + text)        (Draft → Validate → Retry, step logs)
        │                  │                                │
        ▼                  ▼                                ▼
  { text, filename,   { answer,                       { sections, raw, steps[] }
    charCount,         grounded }
    truncated }
```

All three route handlers:

```ts
export const runtime = "nodejs"; // needed for fs (prompt files) + unpdf
```

They accept a Web `Request` and return `Response.json(...)`. No `NextRequest`/`NextResponse` needed.

---

## 4. Folder & File Responsibilities

| Path | Kind | Responsibility |
| --- | --- | --- |
| `app/layout.tsx` | Server | Root HTML, fonts, metadata (retitled to the app). |
| `app/page.tsx` | Server | Renders `<Workspace />`. No data fetching. |
| `app/api/upload/route.ts` | Route handler | `POST`: read `multipart/form-data`, validate file, call `extractTextFromFile`. |
| `app/api/qa/route.ts` | Route handler | `POST`: validate body, call `answerQuestion`. |
| `app/api/summary/route.ts` | Route handler | `POST`: validate body, call `runSummaryPipeline`. |
| `lib/prompts.ts` | API util | Read `prompts/*.md` + `rules/*.md` from disk at runtime; cache in-process. |
| `lib/gemini.ts` | API util | Construct `GoogleGenAI`; expose `generateText` / `generateJSON`. |
| `lib/extractText.ts` | API util | File bytes → raw text (`txt`/`md` decode, `pdf` via `unpdf`); typed errors. |
| `lib/validation.ts` | API util | Zod request schemas; `parseSummarySections`, `checkRequiredHeaders`. |
| `lib/errors.ts` | API util | `AppError` class (carries HTTP `status` + `code`) + `toErrorResponse`. |
| `services/summaryPipeline.ts` | Business logic | Draft → Validate → Retry orchestration; emits step logs. |
| `services/qa.ts` | Business logic | Build grounded prompt; call Gemini; detect "not found" answers. |
| `types/index.ts` | Types | All shared interfaces. |
| `components/Workspace.tsx` | Client | Owns `useReducer` state; coordinates fetches to the 3 endpoints. |
| `components/UploadDropzone.tsx` | Client | File picker/drag-drop; client-side size/type pre-check. |
| `components/ChatPanel.tsx` | Client | Q&A transcript + question input. |
| `components/SummaryDashboard.tsx` | Client | Renders the 3 parsed sections as cards. |
| `components/StepLogTimeline.tsx` | Client | Renders pipeline step logs with status. |
| `components/ErrorBanner.tsx` | Client | Inline, dismissible error/warning surface. |
| `prompts/system.md` | Prompt | **Exists.** Role + grounding guidelines. |
| `prompts/summary.md` | Prompt | **Exists.** Summary/insights/action-items task. |
| `rules/response_rules.md` | Rule | **Exists.** Zero-hallucination + 3 mandatory headers. |
| `AI_WORKFLOW.md` | Doc | AI development log (deliverable). |
| `README.md` | Doc | Setup, architecture, design decisions. |
| `.env.example` | Config | **Exists.** `GEMINI_API_KEY`, `PORT`. |

---

## 5. Prompt / Rule Loading Contract

All AI instructions live in `.md` files and are **read from disk at runtime** — never hardcoded into source. `lib/prompts.ts`:

```ts
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
```

- Resolve paths from `process.cwd()` (repo root in dev and in the Node server output).
- Cache after first read (the files do not change at runtime).
- Adding a new prompt = add one `.md` file + one entry in `FILES` + one `PromptName` union member. No other code changes.

---

## 6. API Contracts

All errors share one envelope:

```json
{ "error": { "code": "UNSUPPORTED_FILE_TYPE", "message": "Only .txt, .md, and .pdf files are supported." } }
```

### 6.1 `POST /api/upload`

- **Request:** `multipart/form-data`, field `file` (single `File`).
- **Server validation:** extension/MIME in `{ txt, md, pdf }`; size ≤ `5 MB`.
- **Success `200`:**

```json
{ "filename": "report.pdf", "text": "…raw extracted text…", "charCount": 12843, "truncated": false }
```

| Failure | Status | `code` |
| --- | --- | --- |
| Missing `file` field | 400 | `NO_FILE` |
| Unsupported type | 415 | `UNSUPPORTED_FILE_TYPE` |
| > 5 MB | 413 | `FILE_TOO_LARGE` |
| PDF has no extractable text (scanned) | 422 | `NO_TEXT_EXTRACTED` |

### 6.2 `POST /api/qa`

- **Request `application/json`:** `{ "text": string, "question": string }` (both non-empty; validated by `qaRequestSchema`).
- **Success `200`:** `{ "answer": string, "grounded": boolean }` — `grounded` is `false` when the model returns the configured "cannot find this information" sentinel.

| Failure | Status | `code` |
| --- | --- | --- |
| Invalid body | 400 | `INVALID_REQUEST` |
| Gemini error/timeout | 502 | `LLM_ERROR` |
| Missing API key | 500 | `MISSING_API_KEY` |

### 6.3 `POST /api/summary`

- **Request `application/json`:** `{ "text": string }` (non-empty; `summaryRequestSchema`).
- **Success `200`:**

```json
{
  "raw": "### Executive Summary\n…\n### Key Insights\n…\n### Action Items\n…",
  "sections": {
    "executiveSummary": "…",
    "keyInsights": ["…", "…"],
    "actionItems": ["…", "…"]
  },
  "valid": true,
  "steps": [
    { "name": "draft",    "status": "success", "attempt": 1, "message": "Draft generated (812 chars).", "durationMs": 1421 },
    { "name": "validate", "status": "success", "attempt": 1, "message": "All required headers present.", "durationMs": 2 }
  ]
}
```

- On unrecoverable format failure the call still returns **`200`** with `valid: false`, the best-effort `raw`, whatever `sections` could be parsed, and a `failed`/`warning` step — the UI degrades gracefully rather than erroring.
- Same `502` / `500` failures as `/api/qa` for hard infrastructure errors.

---

## 7. TypeScript Data Contracts (`types/index.ts`)

```ts
export type PromptName = "system" | "summary" | "responseRules";

export type SupportedFileType = "txt" | "md" | "pdf";

export interface UploadResult {
  filename: string;
  text: string;
  charCount: number;
  truncated: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
}

export interface QaResponse {
  answer: string;
  grounded: boolean;
}

export interface SummarySections {
  executiveSummary: string;
  keyInsights: string[];
  actionItems: string[];
}

export type StepName = "draft" | "validate" | "retry" | "finalize";
export type StepStatus = "running" | "success" | "warning" | "failed";

export interface PipelineStep {
  name: StepName;
  status: StepStatus;
  attempt: number;
  message: string;
  durationMs: number;
}

export interface SummaryResult {
  raw: string;
  sections: SummarySections;
  valid: boolean;
  steps: PipelineStep[];
}

export interface ApiError {
  error: { code: string; message: string };
}
```

No `any` anywhere. API responses are typed against these on both the route handler and the client fetch.

---

## 8. Multi-Step AI Flow — Draft → Validate → Retry (`services/summaryPipeline.ts`)

**Why this flow exists:** `gemini-3.1-flash-lite-preview` will occasionally drop a required header or add conversational filler, both of which break the dashboard parser and violate `rules/response_rules.md`. A cheap deterministic check plus a bounded LLM self-correction loop turns an unreliable single call into a reliable structured payload — and the visible step log demonstrates the engineering thinking the assessment asks for.

**Constant:** `MAX_ATTEMPTS = 2` (one draft + up to two correction passes).

**Sequence:**

1. **Draft** — `generateText` with `system.md` + `summary.md` + the document text. Push a `draft` step.
2. **Validate (deterministic, zero token cost)** — `checkRequiredHeaders(raw)` confirms all three headers exist: `### Executive Summary`, `### Key Insights`, `### Action Items`. Push a `validate` step (`success` or `warning` listing the missing headers).
3. **Retry / self-correct** — while invalid and attempts remain: call `generateText` with `rules/response_rules.md` + the broken draft + an instruction to return the corrected document only. Re-validate. Push a `retry` step per attempt.
4. **Finalize** — when valid (or attempts exhausted): `parseSummarySections(raw)` builds the typed `sections`. If still invalid, status is `warning`/`failed`, `valid: false`, and the best-effort text is returned anyway. Push a `finalize` step.

Each step is timed (`durationMs`) and accumulated into `steps[]`, returned to the client and rendered live by `StepLogTimeline`. The pipeline **never throws on a format failure** — only genuine infrastructure errors (missing key, Gemini down) propagate as `AppError`.

`checkRequiredHeaders` and `parseSummarySections` live in `lib/validation.ts` and split `raw` on the three `### ` headers; insights/action-items are parsed as markdown list items (`- ` / `* ` / `1. `).

---

## 9. State Management (`components/Workspace.tsx`)

Constitution order is server → URL → React state. With no server persistence and a single-screen tool, one `useReducer` owns everything:

```ts
interface WorkspaceState {
  document: UploadResult | null;
  messages: ChatMessage[];
  summary: SummaryResult | null;
  status: "idle" | "uploading" | "asking" | "summarizing";
  error: string | null;
}

type WorkspaceAction =
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_SUCCESS"; document: UploadResult }
  | { type: "ASK_START"; question: string }
  | { type: "ASK_SUCCESS"; response: QaResponse }
  | { type: "SUMMARY_START" }
  | { type: "SUMMARY_SUCCESS"; summary: SummaryResult }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };
```

- Uploading a new document clears `messages` and `summary`.
- `status` drives per-action loading UI; only one async action runs at a time (inputs disabled while busy).
- No global store, no Context, no Redux.

---

## 10. UI Component Tree

```
app/page.tsx (Server)
└── <Workspace>                  "use client" — useReducer, fetch orchestration
    ├── <UploadDropzone>         file in; client pre-check (type + ≤5MB)
    ├── <ErrorBanner>            shows state.error / validation warning
    ├── <ChatPanel>              messages[] transcript + question form
    │     (disabled until a document is loaded)
    ├── <SummaryDashboard>       "Generate summary" button → 3 cards
    │     ├── Executive Summary card
    │     ├── Key Insights card (bullets)
    │     └── Action Items card (checklist)
    └── <StepLogTimeline>        pipeline steps with status icon + timing
```

**Styling (constitution):** Tailwind utilities only, `rounded-xl`, soft shadows, neutral palette; class order layout → spacing → typography → colors → effects.
**Accessibility:** every button has an accessible label; the file input and question input have associated `<label>`s; semantic landmarks (`<main>`, `<section>`); keyboard-operable (Enter submits a question). Loading and empty states are explicit.

---

## 11. Edge-Case Handling Matrix

| Condition | Where caught | Response |
| --- | --- | --- |
| No `file` in form data | `/api/upload` | 400 `NO_FILE` |
| Unsupported extension/MIME | `/api/upload` + client pre-check | 415 `UNSUPPORTED_FILE_TYPE` |
| File > 5 MB | `/api/upload` + client pre-check | 413 `FILE_TOO_LARGE` |
| Scanned/empty PDF (no text) | `lib/extractText` | 422 `NO_TEXT_EXTRACTED` → banner "No selectable text found — the PDF may be scanned." |
| `GEMINI_API_KEY` missing | `lib/gemini` | 500 `MISSING_API_KEY` (clear message, no stack leak) |
| Gemini error / timeout | `lib/gemini` → route | 502 `LLM_ERROR` → banner with a Retry affordance |
| Q&A before upload | `ChatPanel` disabled + `/api/qa` guard | input disabled; 400 `INVALID_REQUEST` if forced |
| Document longer than budget | `lib/extractText` / pipeline input | truncate to `MAX_INPUT_CHARS = 30000`, set `truncated: true`, show a notice |
| Summary invalid after max retries | `services/summaryPipeline` | 200 + `valid: false` + best-effort text + warning step |
| Validator returns malformed output | `services/summaryPipeline` | fall back to the last deterministic check; never crash |

No unhandled async errors: every `await` in a route handler is wrapped so failures map to the envelope above.

---

## 12. Environment & Config

- `.env.example` (exists): `GEMINI_API_KEY=your_api_key_here`, `PORT=3000`. Developers copy to `.env`.
- `GEMINI_API_KEY` is read **only** in `lib/gemini.ts`. A missing key produces `MISSING_API_KEY` rather than a crash.
- Limits as named constants in `lib/`: `MAX_FILE_BYTES = 5 * 1024 * 1024`, `MAX_INPUT_CHARS = 30000`, `MAX_ATTEMPTS = 2`, `GEMINI_MODEL = "gemini-3.1-flash-lite-preview"`.
- Route handlers pin `export const runtime = "nodejs"`.

---

## 13. Out of Scope

Auth, multi-document workspaces, server-side persistence/DB, streaming responses, vector search/RAG over chunked embeddings, file storage. The single extracted string is the entire context window — sufficient for the assessment and deliberately simple. Revisit only if explicitly requested.
