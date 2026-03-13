import rateLimit from "express-rate-limit";

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  message: "Too many requests. Please try again later.",
});
