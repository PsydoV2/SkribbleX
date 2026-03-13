import { Request, Response, NextFunction } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";

/**
 * Middleware for handling 404 Not Found errors.
 * Triggered when no route matches the incoming request.
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(HTTPCodes.NotFound).json({ message: "Route not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err && typeof (err as any).status === "number") {
    return res
      .status((err as any).status)
      .json({ message: (err as any).message });
  }

  res.status(HTTPCodes.InternalServerError).json({
    message: "Internal server error",
  });
}
