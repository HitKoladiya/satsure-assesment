export type PromptName = "system" | "summary" | "responseRules";

export type SupportedFileType = "txt" | "md" | "pdf";

export interface UploadResult {
  filename: string;
  text: string;
  charCount: number;
  truncated: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
}

export interface QaResponse {
  answer: string;
  grounded: boolean;
}

export interface SummarySections {
  executiveSummary: string;
  keyInsights: string[];
  actionItems: string[];
}

export type StepName = "draft" | "validate" | "retry" | "finalize";

export type StepStatus = "running" | "success" | "warning" | "failed";

export interface PipelineStep {
  name: StepName;
  status: StepStatus;
  attempt: number;
  message: string;
  durationMs: number;
}

export interface SummaryResult {
  raw: string;
  sections: SummarySections;
  valid: boolean;
  steps: PipelineStep[];
}

export interface ApiError {
  error: { code: string; message: string };
}
