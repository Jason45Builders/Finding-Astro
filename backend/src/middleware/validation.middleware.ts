/**
 * validation.middleware.ts — FIXED
 * Original used schema.parse() which throws synchronously and bypasses
 * asyncHandler, crashing the process on bad input.
 * Fixed to use safeParse() which routes errors through next() properly.
 */

import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodTypeAny } from "zod";

const validate =
  (schema: ZodTypeAny, target: "body" | "query" | "params"): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    Object.assign(request[target], result.data);
    next();
  };

export const validateBody   = (schema: ZodTypeAny): RequestHandler => validate(schema, "body");
export const validateQuery  = (schema: ZodTypeAny): RequestHandler => validate(schema, "query");
export const validateParams = (schema: ZodTypeAny): RequestHandler => validate(schema, "params");
