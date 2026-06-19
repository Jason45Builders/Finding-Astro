/**
 * error.middleware.ts — UPDATED
 * Handles ZodError → 422, JWT errors → 401, Postgres codes → 409/422.
 * All unhandled errors get a unique requestId for tracing.
 */

import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.cause = cause;
  }
}

export const notFoundHandler = (request: Request, response: Response): void => {
  response.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Route ${request.method} ${request.path} not found`,
  });
};

export const errorHandler = (
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
): void => {
  const requestId = crypto.randomBytes(4).toString("hex");

  // Zod validation error → 422 with field-level detail
  if (error instanceof ZodError) {
    const fields = error.errors.map((e) => ({
      field:   e.path.join("."),
      message: e.message,
    }));
    response.status(422).json({
      success: false,
      code:    "VALIDATION_ERROR",
      message: "Request validation failed",
      fields,
    });
    return;
  }

  // Known application error
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, { requestId, code: error.code, path: request.path, cause: error.cause });
    }
    response.status(error.statusCode).json({
      success:   false,
      code:      error.code,
      message:   error.message,
      requestId: error.statusCode >= 500 ? requestId : undefined,
    });
    return;
  }

  // JWT errors → clean 401
  if (error instanceof Error &&
      (error.name === "JsonWebTokenError" ||
       error.name === "TokenExpiredError" ||
       error.name === "NotBeforeError")) {
    response.status(401).json({
      success: false,
      code:    "INVALID_TOKEN",
      message: error.name === "TokenExpiredError"
        ? "Session expired — please log in again"
        : "Invalid authentication token",
    });
    return;
  }

  // Postgres errors
  if (error && typeof error === "object" && "code" in error) {
    const pg = error as { code: string };
    if (pg.code === "23505") {
      response.status(409).json({ success: false, code: "CONFLICT", message: "This record already exists" });
      return;
    }
    if (pg.code === "23503") {
      response.status(422).json({ success: false, code: "REFERENCE_NOT_FOUND", message: "A referenced record does not exist" });
      return;
    }
    if (pg.code === "23502") {
      response.status(422).json({ success: false, code: "MISSING_REQUIRED_FIELD", message: "A required field is missing" });
      return;
    }
  }

  // Fallback
  logger.error("Unhandled error", {
    requestId,
    message: error instanceof Error ? error.message : String(error),
    stack:   error instanceof Error ? error.stack : undefined,
    path:    request.path,
  });
  response.status(500).json({
    success:   false,
    code:      "INTERNAL_ERROR",
    message:   "An unexpected error occurred",
    requestId,
  });
};
