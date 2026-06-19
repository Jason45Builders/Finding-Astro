import { NextFunction, Request, Response } from "express";

export interface SuccessResponseMeta {
  count?: number;
  [key: string]: number | string | boolean | undefined;
}

export const sendSuccess = <T>(
  response: Response,
  data: T,
  message = "OK",
  meta?: SuccessResponseMeta,
  statusCode = 200
): Response => response.status(statusCode).json({ success: true, message, data, meta });

export const sendCreated = <T>(response: Response, data: T, message = "Created"): Response =>
  sendSuccess(response, data, message, undefined, 201);

export const asyncHandler =
  (
    handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
  ) =>
  (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };
