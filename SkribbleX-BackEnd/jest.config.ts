import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  clearMocks: true,
  forceExit: true,
  moduleNameMapper: {
    // nanoid v5 ist ESM-only → CJS-kompatibler Mock
    "^nanoid$": "<rootDir>/tests/__mocks__/nanoid.ts",
    "^nanoid/(.*)$": "<rootDir>/tests/__mocks__/nanoid.ts",
  },
};

export default config;
