import fs from "fs/promises";
import path from "path";

export enum LogSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * LogHelper utility class
 * - Provides file-based logging (info logs)
 * - Provides optional database-based logging (errors)
 * - Can be adapted depending on project requirements
 */
export class LogHelper {
  /**
   * Logs informational messages to a file.
   * @param route API route or function name
   * @param message Log message
   */
  static async logInfo(route: string, message: string) {
    try {
      const logDir = path.resolve(process.cwd(), "logs");
      await fs.mkdir(logDir, { recursive: true });

      const now = new Date();
      const day = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const filePath = path.join(logDir, `info-${day}.log`);

      const line =
        `${now.toISOString()} | ${LogSeverity.INFO.toUpperCase()} | ${route} | ` +
        `${String(message).replace(/\s+/g, " ").trim()}\n`;

      await fs.appendFile(filePath, line, "utf8");
    } catch (fileErr) {
      console.error("❌ Failed to write info log file:", fileErr);
    }
  }
}
