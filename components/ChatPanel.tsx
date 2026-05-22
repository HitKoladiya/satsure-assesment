"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onAsk: (question: string) => void;
  disabled: boolean;
  isAsking: boolean;
}

export function ChatPanel({ messages, onAsk, disabled, isAsking }: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled || isAsking) return;
    onAsk(trimmed);
    setQuestion("");
  }

  return (
    <section
      aria-label="Document Q&A"
      className="flex flex-col gap-0 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-neutral-900">Ask a Question</h2>
      </div>

      {/* Transcript */}
      <div
        ref={transcriptRef}
        className="flex flex-col gap-3 overflow-y-auto px-5 py-4"
        style={{ minHeight: "200px", maxHeight: "360px" }}
        aria-live="polite"
        aria-label="Conversation transcript"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Ask anything about the uploaded document.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={[
                "flex flex-col gap-1",
                msg.role === "user" ? "items-end" : "items-start",
              ].join(" ")}
            >
              <div
                className={[
                  "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-800",
                ].join(" ")}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.grounded === false && (
                <span className="text-xs text-neutral-400">
                  Not found in document
                </span>
              )}
            </div>
          ))
        )}
        {isAsking && (
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-neutral-100 px-3.5 py-2.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"
                  style={{ animationDelay: `${i * 120}ms` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-neutral-100 px-5 py-4"
      >
        <label htmlFor="question-input" className="sr-only">
          Ask a question about the document
        </label>
        <div className="flex gap-2">
          <input
            id="question-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={disabled ? "Upload a document first…" : "Ask a question…"}
            disabled={disabled || isAsking}
            className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={disabled || isAsking || !question.trim()}
            aria-label="Send question"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
