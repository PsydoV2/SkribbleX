// tests/word.service.test.ts
import { WordService } from "../src/services/word.service";

// fs mocken damit kein echtes words.json gebraucht wird
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

import fs from "fs";
const mockReadFileSync = fs.readFileSync as jest.Mock;

const MOCK_WORDS = {
  de: {
    Tiere: ["Katze", "Hund", "Vogel"],
    Sport:  ["Fußball", "Tennis"],
  },
  en: {
    Animals: ["Cat", "Dog", "Bird"],
    Sports:  ["Soccer", "Tennis"],
  },
};

beforeEach(() => {
  mockReadFileSync.mockReturnValue(JSON.stringify(MOCK_WORDS));
  WordService.reload();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── getCategories ────────────────────────────────────────────────────────────

describe("WordService.getCategories", () => {
  it("gibt deutsche Kategorien zurück", () => {
    expect(WordService.getCategories("de")).toEqual(["Tiere", "Sport"]);
  });

  it("gibt englische Kategorien zurück", () => {
    expect(WordService.getCategories("en")).toEqual(["Animals", "Sports"]);
  });

  it("gibt leeres Array zurück bei unbekannter Sprache", () => {
    expect(WordService.getCategories("xx" as any)).toEqual([]);
  });
});

// ─── getRandomWord ────────────────────────────────────────────────────────────

describe("WordService.getRandomWord", () => {
  it("gibt ein Wort aus der gewählten Kategorie zurück", () => {
    const word = WordService.getRandomWord("de", ["Tiere"]);
    expect(["Katze", "Hund", "Vogel"]).toContain(word);
  });

  it("gibt ein Wort aus mehreren Kategorien zurück", () => {
    const all = ["Katze", "Hund", "Vogel", "Fußball", "Tennis"];
    const word = WordService.getRandomWord("de", ["Tiere", "Sport"]);
    expect(all).toContain(word);
  });

  it("gibt ein englisches Wort zurück", () => {
    const word = WordService.getRandomWord("en", ["Animals"]);
    expect(["Cat", "Dog", "Bird"]).toContain(word);
  });

  it("Fallback auf alle Kategorien wenn keine Kategorie Wörter hat", () => {
    const word = WordService.getRandomWord("de", ["UNGÜLTIG"]);
    const allDe = ["Katze", "Hund", "Vogel", "Fußball", "Tennis"];
    expect(allDe).toContain(word);
  });

  it("gibt '???' zurück wenn Sprache komplett leer ist", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ de: {}, en: {} }));
    WordService.reload();
    expect(WordService.getRandomWord("de", [])).toBe("???");
  });

  it("gibt immer einen String zurück", () => {
    for (let i = 0; i < 20; i++) {
      expect(typeof WordService.getRandomWord("de", ["Tiere"])).toBe("string");
    }
  });

  it("wählt zufällig aus dem Pool (nicht immer dasselbe)", () => {
    const results = new Set(
      Array.from({ length: 50 }, () => WordService.getRandomWord("de", ["Tiere"]))
    );
    expect(results.size).toBeGreaterThan(1);
  });
});

// ─── Fallback bei fehlendem words.json ────────────────────────────────────────

describe("WordService Fallback", () => {
  it("aktiviert Fallback wenn words.json nicht gelesen werden kann", () => {
    mockReadFileSync.mockImplementation(() => { throw new Error("File not found"); });
    WordService.reload();
    // Kein Crash – Fallback-Wörter aktiv
    expect(() => WordService.getRandomWord("de", ["Allgemein"])).not.toThrow();
  });

  it("Fallback enthält deutsche Wörter", () => {
    mockReadFileSync.mockImplementation(() => { throw new Error("File not found"); });
    WordService.reload();
    const word = WordService.getRandomWord("de", ["Allgemein"]);
    expect(["Katze", "Hund", "Haus", "Auto", "Baum"]).toContain(word);
  });

  it("Fallback enthält englische Wörter", () => {
    mockReadFileSync.mockImplementation(() => { throw new Error("File not found"); });
    WordService.reload();
    const word = WordService.getRandomWord("en", ["General"]);
    expect(["Cat", "Dog", "House", "Car", "Tree"]).toContain(word);
  });

  it("aktiviert Fallback wenn JSON ungültig ist", () => {
    mockReadFileSync.mockReturnValue("KEIN_VALIDES_JSON{{{{");
    expect(() => WordService.reload()).not.toThrow();
  });
});

// ─── reload ───────────────────────────────────────────────────────────────────

describe("WordService.reload", () => {
  it("lädt neue Wortliste nach reload", () => {
    const updated = {
      de: { Neu: ["Eins", "Zwei"] },
      en: { New: ["One", "Two"] },
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(updated));
    WordService.reload();
    expect(WordService.getCategories("de")).toEqual(["Neu"]);
  });
});
