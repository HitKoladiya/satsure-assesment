import { extractTextFromFile } from "@/lib/extractText";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new AppError(400, "NO_FILE", "No file was provided.");
    }
    const result = await extractTextFromFile(file);
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
