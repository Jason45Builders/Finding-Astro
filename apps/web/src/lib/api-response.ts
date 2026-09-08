import { NextResponse } from "next/server";

export type ApiResponse<T> = {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  count?: number;
  requestId?: string;
};

const generateRequestId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const ok = <T>(data: T, message = "OK", extra?: Partial<ApiResponse<T>>): NextResponse<ApiResponse<T>> => {
  const requestId = extra?.requestId ?? generateRequestId();
  return NextResponse.json({ success: true, data, message, ...extra, requestId }, { status: 200 });
};

export const created = <T>(data: T, message = "Created"): NextResponse<ApiResponse<T>> => {
  const requestId = generateRequestId();
  return NextResponse.json({ success: true, data, message, requestId }, { status: 201 });
};

export const fail = (status: number, code: string, message: string, requestId?: string): NextResponse<ApiResponse<never>> => {
  const rid = requestId ?? generateRequestId();
  return NextResponse.json({ success: false, code, message, requestId: rid }, { status });
};

export const badRequest = (code: string, message: string): NextResponse<ApiResponse<never>> => fail(400, code, message);

export const unauthorized = (message = "Authentication required"): NextResponse<ApiResponse<never>> => fail(401, "UNAUTHORIZED", message);

export const forbidden = (message: string): NextResponse<ApiResponse<never>> => fail(403, "FORBIDDEN", message);

export const notFound = (message = "Not found"): NextResponse<ApiResponse<never>> => fail(404, "NOT_FOUND", message);

export const conflict = (message = "Conflict"): NextResponse<ApiResponse<never>> => fail(409, "CONFLICT", message);

export const validationError = (fields: { field: string; message: string }[]): NextResponse<ApiResponse<never>> => {
  const requestId = generateRequestId();
  return NextResponse.json({
    success: false,
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    fields,
    requestId,
  }, { status: 422 });
};

export const serverError = (message = "An unexpected error occurred", error?: unknown): NextResponse<ApiResponse<never>> => {
  if (error) {
    console.error("[serverError]", message, error);
  } else {
    console.error("[serverError]", message);
  }
  const safeMessage = process.env.NODE_ENV === "production" ? "An unexpected error occurred" : message;
  return fail(500, "INTERNAL_ERROR", safeMessage);
};
