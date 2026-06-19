import { ParamsDictionary } from "express-serve-static-core";
import { AppError } from "../middleware/error.middleware";

export const requiredParam = (params: ParamsDictionary, key: string): string => {
  const value = params[key];
  if (typeof value !== "string" || !value) {
    throw new AppError(`Missing route parameter: ${key}`, 400, "INVALID_ROUTE_PARAM");
  }
  return value;
};

export const optionalQuery = <T>(value: unknown, parse: (value: string) => T): T | undefined => {
  if (typeof value !== "string") return undefined;
  return parse(value);
};
