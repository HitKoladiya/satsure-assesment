import type { PipelineStep, StepStatus } from "@/types";

interface StepLogTimelineProps {
  steps: PipelineStep[];
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "success") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === "warning") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-neutral-400" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const STEP_LABELS: Record<string, string> = {
  draft: "Draft",
  validate: "Validate",
  retry: "Self-correct",
  finalize: "Finalize",
};

export function StepLogTimeline({ steps }: StepLogTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
        Pipeline log
      </p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
            <span className="mt-0.5 shrink-0">
              <StatusIcon status={step.status} />
            </span>
            <span className="flex-1">
              <span className="font-medium text-neutral-700">
                {STEP_LABELS[step.name] ?? step.name}
              </span>
              {step.name === "retry" && (
                <span className="ml-1 text-neutral-400">#{step.attempt}</span>
              )}
              {" — "}
              {step.message}
            </span>
            <span className="shrink-0 tabular-nums text-neutral-400">
              {step.durationMs}ms
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
