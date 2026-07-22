import { z } from "zod";
import { validationError } from "./api-response";
import { NextResponse } from "next/server";

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = Object.entries(result.error.flatten().fieldErrors).map(
      ([field, messages]) => ({
        field,
        message: Array.isArray(messages) ? messages[0] : "Invalid",
      }),
    );
    return { ok: false, response: validationError(fields) };
  }
  return { ok: true, data: result.data };
}

export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});
