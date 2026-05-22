import { describe, it, expect, vi } from "vitest";

// detectType is pure and never touches unpdf; mock it so the test stays fast and isolated.
vi.mock("unpdf", () => ({
  extractText: vi.fn(),
  getDocumentProxy: vi.fn(),
}));

import { detectType } from "@/lib/extractText";
import { AppError } from "@/lib/errors";

describe("detectType", () => {
  it("detects type by file extension", () => {
    expect(detectType("notes.txt", "")).toBe("txt");
    expect(detectType("readme.md", "")).toBe("md");
    expect(detectType("paper.pdf", "")).toBe("pdf");
  });

  it("is case-insensitive on the extension", () => {
    expect(detectType("REPORT.PDF", "")).toBe("pdf");
  });

  it("falls back to MIME type when the extension is unknown", () => {
    expect(detectType("file", "application/pdf")).toBe("pdf");
    expect(detectType("file", "text/markdown")).toBe("md");
    expect(detectType("file", "text/csv")).toBe("txt");
  });

  it("throws AppError for unsupported types", () => {
    expect(() => detectType("image.png", "image/png")).toThrow(AppError);
  });
});
