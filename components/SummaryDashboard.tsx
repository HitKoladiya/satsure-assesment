"use client";

import { StepLogTimeline } from "@/components/StepLogTimeline";
import type { SummaryResult } from "@/types";

interface SummaryDashboardProps {
  summary: SummaryResult | null;
  onGenerate: () => void;
  disabled: boolean;
  isSummarizing: boolean;
}

export function SummaryDashboard({
  summary,
  onGenerate,
  disabled,
  isSummarizing,
}: SummaryDashboardProps) {
  return (
    <section
      aria-label="Document summary"
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Summary</h2>
        <button
          onClick={onGenerate}
          disabled={disabled || isSummarizing}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Generate document summary, key insights, and action items"
        >
          {isSummarizing ? "Generating…" : summary ? "Regenerate" : "Generate"}
        </button>
      </div>

      {!summary && !isSummarizing && (
        <p className="text-sm text-neutral-400">
          Click Generate to produce an Executive Summary, Key Insights, and Action Items.
        </p>
      )}

      {isSummarizing && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Running draft → validate → retry pipeline…
        </div>
      )}

      {summary && (
        <>
          {!summary.valid && (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Format validation did not fully pass. Showing best-effort output.
            </div>
          )}

          {/* Executive Summary card */}
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Executive Summary
            </h3>
            <p className="text-sm leading-relaxed text-neutral-700">
              {summary.sections.executiveSummary || "—"}
            </p>
          </div>

          {/* Key Insights card */}
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Key Insights
            </h3>
            {summary.sections.keyInsights.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {summary.sections.keyInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No insights extracted.</p>
            )}
          </div>

          {/* Action Items card */}
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Action Items
            </h3>
            {summary.sections.actionItems.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {summary.sections.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No action items extracted.</p>
            )}
          </div>

          <StepLogTimeline steps={summary.steps} />
        </>
      )}
    </section>
  );
}
