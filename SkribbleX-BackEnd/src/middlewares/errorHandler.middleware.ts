import { NextFunction, Request, Response } from "express";
import { LogHelper, LogSeverity } from "../helper/log.helper";
import { HTTPCodes } from "../utils/httpCodes.util";

export async function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const route = req.originalUrl || req.url;
  const status =
    err && typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : HTTPCodes.InternalServerError;

  // A "normal" 4xx (bad request, not found, forbidden, ...) is expected
  // application behavior; anything else is unexpected and worth flagging.
  const severity =
    status >= 400 && status < 500 ? LogSeverity.WARNING : LogSeverity.CRITICAL;

  await LogHelper.logError(route, err, severity);

  if (err && typeof (err as { message?: unknown }).message === "string") {
    return res
      .status(status)
      .json({ message: (err as { message: string }).message });
  }

  res.status(HTTPCodes.InternalServerError).json({
    message: "Internal server error",
  });
}
