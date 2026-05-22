"use client";

import { useReducer } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ChatPanel } from "@/components/ChatPanel";
import { SummaryDashboard } from "@/components/SummaryDashboard";
import type {
  ApiError,
  ChatMessage,
  QaResponse,
  SummaryResult,
  UploadResult,
} from "@/types";

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
  | { type: "DISMISS_ERROR" }
  | { type: "RESET" };

const initialState: WorkspaceState = {
  document: null,
  messages: [],
  summary: null,
  status: "idle",
  error: null,
};

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "UPLOAD_START":
      return { ...state, status: "uploading", error: null };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        document: action.document,
        messages: [],
        summary: null,
        status: "idle",
        error: null,
      };
    case "ASK_START":
      return {
        ...state,
        status: "asking",
        error: null,
        messages: [
          ...state.messages,
          { id: crypto.randomUUID(), role: "user", content: action.question },
        ],
      };
    case "ASK_SUCCESS":
      return {
        ...state,
        status: "idle",
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: action.response.answer,
            grounded: action.response.grounded,
          },
        ],
      };
    case "SUMMARY_START":
      return { ...state, status: "summarizing", error: null, summary: null };
    case "SUMMARY_SUCCESS":
      return { ...state, status: "idle", summary: action.summary };
    case "ERROR":
      return { ...state, status: "idle", error: action.message };
    case "DISMISS_ERROR":
      return { ...state, error: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function isApiError(data: unknown): data is ApiError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ApiError).error?.message === "string"
  );
}

// Send only the last 5 Q&A exchanges (each = one question + its answer) as context.
const HISTORY_EXCHANGES = 5;

export function Workspace() {
  const [state, dispatch] = useReducer(reducer, initialState);

  async function handleAsk(question: string) {
    if (!state.document) return;
    const history = state.messages
      .slice(-HISTORY_EXCHANGES * 2)
      .map(({ role, content }) => ({ role, content }));
    dispatch({ type: "ASK_START", question });
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: state.document.text, question, history }),
      });
      const data: unknown = await res.json();
      if (isApiError(data)) {
        dispatch({ type: "ERROR", message: (data as ApiError).error.message });
        return;
      }
      dispatch({ type: "ASK_SUCCESS", response: data as QaResponse });
    } catch {
      dispatch({ type: "ERROR", message: "Request failed. Please try again." });
    }
  }

  async function handleSummary() {
    if (!state.document) return;
    dispatch({ type: "SUMMARY_START" });
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: state.document.text }),
      });
      const data: unknown = await res.json();
      if (isApiError(data)) {
        dispatch({ type: "ERROR", message: (data as ApiError).error.message });
        return;
      }
      dispatch({ type: "SUMMARY_SUCCESS", summary: data as SummaryResult });
    } catch {
      dispatch({ type: "ERROR", message: "Request failed. Please try again." });
    }
  }

  async function handleUpload(file: File) {
    dispatch({ type: "UPLOAD_START" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data: unknown = await res.json();
      if (isApiError(data)) {
        dispatch({ type: "ERROR", message: data.error.message });
        return;
      }
      dispatch({ type: "UPLOAD_SUCCESS", document: data as UploadResult });
    } catch {
      dispatch({ type: "ERROR", message: "Upload failed. Please try again." });
    }
  }

  const isLoading = state.status !== "idle";

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              AI Workspace Assistant
            </h1>
            <p className="text-sm text-neutral-500">
              Upload a document, ask questions, generate insights
            </p>
          </div>
          {state.document && (
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
              aria-label="Clear document and start over"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        {/* Error banner */}
        {state.error && (
          <ErrorBanner
            message={state.error}
            onDismiss={() => dispatch({ type: "DISMISS_ERROR" })}
          />
        )}

        {/* Upload section */}
        <section aria-label="Document upload">
          {state.document ? (
            <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {state.document.filename}
                </p>
                <p className="text-xs text-neutral-500">
                  {state.document.charCount.toLocaleString()} characters extracted
                  {state.document.truncated && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      Truncated to 30 000 chars
                    </span>
                  )}
                </p>
              </div>
              <UploadDropzone
                onFileSelect={handleUpload}
                disabled={isLoading}
                compact
              />
            </div>
          ) : (
            <UploadDropzone onFileSelect={handleUpload} disabled={isLoading} />
          )}
        </section>

        {/* Content panels */}
        {state.document && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <SummaryDashboard
              summary={state.summary}
              onGenerate={handleSummary}
              disabled={state.status !== "idle"}
              isSummarizing={state.status === "summarizing"}
            />
            <ChatPanel
              messages={state.messages}
              onAsk={handleAsk}
              disabled={state.status !== "idle"}
              isAsking={state.status === "asking"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
