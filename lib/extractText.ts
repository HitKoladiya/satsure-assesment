import { extractText as extractPdfText, getDocumentProxy } from "unpdf";
import { AppError } from "@/lib/errors";
import type { SupportedFileType, UploadResult } from "@/types";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_INPUT_CHARS = 30_000;

const EXTENSIONS: Record<string, SupportedFileType> = {
  txt: "txt",
  md: "md",
  pdf: "pdf",
};

export function detectType(filename: string, mime: string): SupportedFileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const byExt = EXTENSIONS[ext];
  if (byExt) return byExt;
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/markdown") return "md";
  if (mime.startsWith("text/")) return "txt";
  throw new AppError(
    415,
    "UNSUPPORTED_FILE_TYPE",
    "Only .txt, .md, and .pdf files are supported.",
  );
}

export async function extractTextFromFile(file: File): Promise<UploadResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new AppError(413, "FILE_TOO_LARGE", "File exceeds the 5 MB limit.");
  }

  const type = detectType(file.name, file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());

  let raw: string;
  if (type === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractPdfText(pdf, { mergePages: true });
    raw = text;
  } else {
    raw = new TextDecoder().decode(bytes);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new AppError(
      422,
      "NO_TEXT_EXTRACTED",
      "No selectable text found — the file may be scanned or empty.",
    );
  }

  const truncated = trimmed.length > MAX_INPUT_CHARS;
  const text = truncated ? trimmed.slice(0, MAX_INPUT_CHARS) : trimmed;

  return {
    filename: file.name,
    text,
    charCount: text.length,
    truncated,
  };
}
