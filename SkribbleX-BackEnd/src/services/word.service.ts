// src/services/word.service.ts
import * as fs from "fs";
import * as path from "path";
import type { Language } from "../types/RoomState";

interface WordEntry {
  word: string;
  language: Language;
  category: string;
}

export class WordService {
  private static words: WordEntry[] = [];
  private static loaded = false;

  // ── Load ──────────────────────────────────────────────────────────────────

  private static load(): void {
    if (this.loaded) return;
    this.reload();
  }

  /** Public — allows tests to reset state and re-read the mock. */
  static reload(): void {
    this.loaded = false;
    this.words = [];

    try {
      // Try multiple candidate paths so it works regardless of cwd / build output
      const candidates = [
        path.join(__dirname, "..", "..", "data", "words.json"),
        path.join(__dirname, "..", "data", "words.json"),
        path.join(__dirname, "data", "words.json"),
        path.join(process.cwd(), "data", "words.json"),
      ];

      let raw: string | null = null;
      for (const candidate of candidates) {
        try {
          raw = fs.readFileSync(candidate, "utf-8");
          console.debug(`[WordService] Loaded words.json from: ${candidate}`);
          break;
        } catch {
          // try next candidate
        }
      }

      if (!raw) throw new Error("words.json not found in any candidate path");

      const parsed = JSON.parse(raw);
      this.words = this.parse(parsed);
    } catch {
      console.warn(
        "[WordService] words.json not found or invalid, using built-in fallback",
      );
      this.words = FALLBACK_WORDS;
    }

    this.loaded = true;
  }

  // ── Parse ─────────────────────────────────────────────────────────────────

  private static parse(parsed: unknown): WordEntry[] {
    if (Array.isArray(parsed)) {
      // Format 1: [{ word, language, category }, ...]
      return parsed as WordEntry[];
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Unexpected words.json format");
    }

    const entries: WordEntry[] = [];

    for (const [lang, categoryMap] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof categoryMap !== "object" || categoryMap === null) continue;

      if (Array.isArray(categoryMap)) {
        // Format 2: { de: [{ word, category }], en: [...] }
        for (const item of categoryMap as {
          word: string;
          category: string;
        }[]) {
          entries.push({
            word: item.word,
            language: lang as Language,
            category: item.category,
          });
        }
      } else {
        // Format 3 (this project): { de: { Tiere: ["Katze", ...] }, en: { Animals: [...] } }
        for (const [category, wordList] of Object.entries(
          categoryMap as Record<string, unknown>,
        )) {
          if (!Array.isArray(wordList)) continue;
          for (const word of wordList as string[]) {
            entries.push({ word, language: lang as Language, category });
          }
        }
      }
    }

    return entries;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the categories present in the loaded words.json for a given language.
   * Derived from actual data — not a hardcoded list — so tests with mock data work correctly.
   */
  static getCategories(language: Language): string[] {
    this.load();
    const seen = new Set<string>();
    const order: string[] = [];
    for (const w of this.words) {
      if (w.language === language && !seen.has(w.category)) {
        seen.add(w.category);
        order.push(w.category);
      }
    }
    return order;
  }

  static getRandomWord(
    language: Language = "de",
    categories: string[] = [],
  ): string {
    this.load();

    const normalizedCats = categories.map((c) => c.toLowerCase().trim());

    const pool = this.words.filter((w) => {
      if (w.language !== language) return false;
      if (normalizedCats.length === 0) return true;
      return normalizedCats.includes(w.category.toLowerCase().trim());
    });

    console.debug(
      `[WordService] lang=${language} cats=${JSON.stringify(categories)} ` +
        `pool=${pool.length}/${this.words.length}`,
    );

    if (pool.length === 0) {
      // Fallback: ignore category filter, use all words for this language
      const langPool = this.words.filter((w) => w.language === language);
      if (langPool.length === 0) return "???";
      return langPool[Math.floor(Math.random() * langPool.length)].word;
    }

    return pool[Math.floor(Math.random() * pool.length)].word;
  }
}

// ─── Built-in fallback (used if words.json is missing) ────────────────────────
const FALLBACK_WORDS: WordEntry[] = [
  { word: "Katze", language: "de", category: "Allgemein" },
  { word: "Hund", language: "de", category: "Allgemein" },
  { word: "Haus", language: "de", category: "Allgemein" },
  { word: "Auto", language: "de", category: "Allgemein" },
  { word: "Baum", language: "de", category: "Allgemein" },
  { word: "Cat", language: "en", category: "General" },
  { word: "Dog", language: "en", category: "General" },
  { word: "House", language: "en", category: "General" },
  { word: "Car", language: "en", category: "General" },
  { word: "Tree", language: "en", category: "General" },
];
