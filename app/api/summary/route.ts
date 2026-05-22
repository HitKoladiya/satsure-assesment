import { runSummaryPipeline } from "@/services/summaryPipeline";
import { summaryRequestSchema } from "@/lib/validation";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);
    const parsed = summaryRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        400,
        "INVALID_REQUEST",
        "Request must include a non-empty 'text' field.",
      );
    }
    const result = await runSummaryPipeline(parsed.data.text);
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
