import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  clearMocks: true,
  forceExit: true,
  // Set required env vars before any module (incl. src/config/env.config.ts) loads.
  setupFiles: ["<rootDir>/tests/setup.env.ts"],
  moduleNameMapper: {
    // nanoid v5 ist ESM-only → CJS-kompatibler Mock
    "^nanoid$": "<rootDir>/tests/__mocks__/nanoid.ts",
    "^nanoid/(.*)$": "<rootDir>/tests/__mocks__/nanoid.ts",
  },
};

export default config;
