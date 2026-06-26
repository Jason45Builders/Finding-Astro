import { NextResponse } from "next/server";

export type ApiResponse<T> = {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  count?: number;
  requestId?: string;
};

export const ok = <T>(data: T, message = "OK", extra?: Partial<ApiResponse<T>>): NextResponse<ApiResponse<T>> =>
  NextResponse.json({ success: true, data, message, ...extra }, { status: 200 });

export const created = <T>(data: T, message = "Created"): NextResponse<ApiResponse<T>> =>
  NextResponse.json({ success: true, data, message }, { status: 201 });

export const fail = (status: number, code: string, message: string, requestId?: string): NextResponse<ApiResponse<never>> =>
  NextResponse.json({ success: false, code, message, ...(requestId ? { requestId } : {}) }, { status });

export const badRequest = (code: string, message: string): NextResponse<ApiResponse<never>> =>
  fail(400, code, message);

export const unauthorized = (message = "Authentication required"): NextResponse<ApiResponse<never>> =>
  fail(401, "UNAUTHORIZED", message);

export const forbidden = (message: string): NextResponse<ApiResponse<never>> =>
  fail(403, "FORBIDDEN", message);

export const notFound = (message = "Not found"): NextResponse<ApiResponse<never>> =>
  fail(404, "NOT_FOUND", message);

export const conflict = (message = "Conflict"): NextResponse<ApiResponse<never>> =>
  fail(409, "CONFLICT", message);

export const validationError = (fields: { field: string; message: string }[]): NextResponse<ApiResponse<never>> =>
  NextResponse.json({
    success: false,
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    fields,
  }, { status: 422 });

export const serverError = (message = "An unexpected error occurred"): NextResponse<ApiResponse<never>> =>
  fail(500, "INTERNAL_ERROR", message);
