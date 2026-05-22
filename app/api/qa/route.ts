import { answerQuestion } from "@/services/qa";
import { qaRequestSchema } from "@/lib/validation";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);
    const parsed = qaRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        400,
        "INVALID_REQUEST",
        "Request must include non-empty 'text' and 'question' fields.",
      );
    }
    const response = await answerQuestion(parsed.data);
    return Response.json(response);
  } catch (err) {
    return toErrorResponse(err);
  }
}
