# AI Workspace Assistant

A lightweight web tool where you upload a document and interact with it through AI — ask grounded questions, generate a structured summary, and watch the multi-step validation pipeline run in real time.

---

## Setup

**Prerequisites:** Node.js 20+, pnpm, a Google Gemini API key.

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file
cp .env.example .env
# Add your key: GEMINI_API_KEY=your_key_here

# 3. Start the dev server
pnpm dev
# → http://localhost:3000

# 4. build for production and start
pnpm build
pnpm start
```

---

## How to Use

1. **Upload** a `.txt`, `.md`, or `.pdf` file (max 5 MB).
2. **Ask questions** in the Q&A panel — answers are grounded strictly in your document. Recent turns are sent back as context, so follow-ups ("rewrite that", "expand the last point") work.
3. **Generate Summary** — produces an Executive Summary, Key Insights, and Action Items through the Draft → Validate → Retry pipeline. The step-log timeline shows each stage.

---

## Architecture

```
app/page.tsx (Server Component)
└── <Workspace> (Client — useReducer state)
    ├── <UploadDropzone>   file pick / drag-drop + client pre-check
    ├── <ErrorBanner>      dismissible error / warning surface
    ├── <ChatPanel>        grounded Q&A transcript + input
    └── <SummaryDashboard> 3 structured cards + <StepLogTimeline>

app/api/
  upload/route.ts   POST — extract raw text from file
  qa/route.ts       POST — grounded Q&A via Gemini
  summary/route.ts  POST — runs the Draft → Validate → Retry pipeline

lib/
  prompts.ts        load prompt/rule .md files from disk at runtime (cached)
  gemini.ts         GoogleGenAI client + generateText helper
  extractText.ts    txt/md via TextDecoder; pdf via unpdf
  validation.ts     Zod schemas + header-check + section parser
  errors.ts         AppError class + toErrorResponse

services/
  qa.ts             build grounded prompt (+ recent turns), detect not-found sentinel
  summaryPipeline.ts  Draft → Validate → Retry orchestration, step logs

prompts/
  system.md         role + grounding guidelines (read at runtime)
  summary.md        summary task + output format (read at runtime)

rules/
  response_rules.md  zero-hallucination + 3 required headers (read at runtime)
```

The server is **stateless** — extracted document text and recent chat history live in client `useReducer` state and are sent as context on each API call. No database.

---

## AI Workflow Design

The summary endpoint runs a three-step pipeline visible in the UI:

1. **Draft** — Gemini generates the initial summary using `prompts/system.md` + `prompts/summary.md` + `rules/response_rules.md` (so the exact format is known upfront) + the document text.
2. **Validate** — a deterministic header check (`### Executive Summary`, `### Key Insights`, `### Action Items`) runs in 0 ms at zero token cost.
3. **Retry / Self-correct** — if headers are missing, a second Gemini call receives `rules/response_rules.md` + the broken draft and returns a corrected version. Retries up to 2 times.

If the output never passes validation, the best-effort result is returned with `valid: false` and the UI shows a warning banner rather than crashing.

---

## Design Decisions

| Decision | Reason |
| --- | --- |
| `unpdf` for PDF text extraction | Lightweight, serverless-friendly, no native binaries. Chosen over `pdf-parse` (flaky test-file bug) and `pdfjs-dist` (heavier). |
| Parsed dashboard cards, not a markdown renderer | The same section-header parser that powers the UI doubles as the deterministic validation check — no extra dependency. |
| Stateless server + client `useReducer` | No database or session store needed. Simpler, easier to reason about, fits a single-user tool perfectly. |
| Prompts/rules as `.md` files read at runtime | Satisfies the assessment requirement; keeps AI instructions readable and editable without touching source code. |
| Format rules sent in the draft, then a deterministic header check before any LLM correction | The model gets the exact `### ` header rules upfront so the draft usually passes first try; the zero-cost check then only triggers a correction call on the rare miss. |
| Low model temperature (default 0.2), set via env-configurable model name | Grounded Q&A and structured summaries favor determinism over creativity — fewer format drifts and hallucinations. Model name is an env var so it can be swapped without code changes. |

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Override the Gemini model (default `gemini-3.1-flash-lite-preview`) |
| `PORT` | No | Dev server port (default 3000) |

See `.env.example`.

---

## Stack

Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS v4 · `@google/genai` · `unpdf` · `zod`
