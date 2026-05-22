"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  type?: "error" | "warning";
}

export function ErrorBanner({ message, onDismiss, type = "error" }: ErrorBannerProps) {
  const isWarning = type === "warning";

  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-800",
      ].join(" ")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="flex-1">{message}</p>
      <button
        onClick={onDismiss}
        className={[
          "shrink-0 rounded p-0.5 transition-colors",
          isWarning ? "hover:bg-amber-100" : "hover:bg-red-100",
        ].join(" ")}
        aria-label="Dismiss error"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
