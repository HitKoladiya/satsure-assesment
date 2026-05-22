import { describe, it, expect } from "vitest";
import {
  checkRequiredHeaders,
  parseSummarySections,
  toListItems,
} from "@/lib/validation";

describe("checkRequiredHeaders", () => {
  it("passes when all three headers are present", () => {
    const raw = "### Executive Summary\nx\n### Key Insights\ny\n### Action Items\nz";
    expect(checkRequiredHeaders(raw)).toEqual({ valid: true, missing: [] });
  });

  it("reports exactly which headers are missing", () => {
    const result = checkRequiredHeaders("### Executive Summary\nonly this one");
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["### Key Insights", "### Action Items"]);
  });
});

describe("toListItems", () => {
  it("extracts dash, asterisk, and numbered items and strips the marker", () => {
    const block = "- first\n* second\n1. third\nnot a list line";
    expect(toListItems(block)).toEqual(["first", "second", "third"]);
  });

  it("returns an empty array when there are no list markers", () => {
    expect(toListItems("just a paragraph\nwith no bullets")).toEqual([]);
  });
});

describe("parseSummarySections", () => {
  it("splits a well-formed summary into its three sections", () => {
    const raw = [
      "### Executive Summary",
      "A short overview.",
      "### Key Insights",
      "- insight one",
      "- insight two",
      "### Action Items",
      "1. do this",
      "2. do that",
    ].join("\n");

    const result = parseSummarySections(raw);
    expect(result.executiveSummary).toBe("A short overview.");
    expect(result.keyInsights).toEqual(["insight one", "insight two"]);
    expect(result.actionItems).toEqual(["do this", "do that"]);
  });

  it("returns empty fields when headers are absent", () => {
    const result = parseSummarySections("no headers here");
    expect(result.executiveSummary).toBe("");
    expect(result.keyInsights).toEqual([]);
    expect(result.actionItems).toEqual([]);
  });
});
