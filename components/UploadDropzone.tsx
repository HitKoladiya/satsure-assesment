"use client";

import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".pdf"];
const ACCEPTED_MIME = ["text/plain", "text/markdown", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  compact?: boolean;
}

function validateFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
    return "Only .txt, .md, and .pdf files are supported.";
  }
  if (file.size > MAX_BYTES) {
    return "File exceeds the 5 MB limit.";
  }
  return null;
}

export function UploadDropzone({ onFileSelect, disabled, compact = false }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleFile(file: File) {
    const error = validateFile(file);
    if (error) {
      setClientError(error);
      return;
    }
    setClientError(null);
    onFileSelect(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          id="file-upload-compact"
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Replace document"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          aria-label="Replace uploaded document"
        >
          Replace
        </button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload a .txt, .md, or .pdf file by clicking or dragging"
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={disabled ? undefined : handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click(); }}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors",
          isDragging
            ? "border-neutral-400 bg-neutral-100"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-700">
            {disabled ? "Uploading…" : "Drop a file here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            .txt, .md, or .pdf — max 5 MB
          </p>
        </div>
        <input
          ref={inputRef}
          id="file-upload"
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Upload document"
        />
      </div>
      {clientError && (
        <p role="alert" className="text-sm text-red-600">
          {clientError}
        </p>
      )}
    </div>
  );
}
