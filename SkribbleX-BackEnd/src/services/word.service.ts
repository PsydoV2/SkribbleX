// src/services/word.service.ts
import * as fs from "fs";
import * as path from "path";
import type { Language } from "../types/RoomState";

interface WordEntry {
  word: string;
  language: Language;
  category: string;
}

const CATEGORIES: Record<Language, string[]> = {
  de: [
    "Tiere",
    "Essen & Trinken",
    "Sport",
    "Berufe",
    "Natur",
    "Objekte",
    "Fantasy & Mythologie",
    "Fahrzeuge",
  ],
  en: [
    "Animals",
    "Food & Drinks",
    "Sports",
    "Jobs",
    "Nature",
    "Objects",
    "Fantasy & Mythology",
    "Vehicles",
  ],
};

export class WordService {
  private static words: WordEntry[] = [];
  private static loaded = false;

  private static load(): void {
    if (this.loaded) return;
    try {
      // Try multiple candidate paths — works regardless of cwd or build output location
      const candidates = [
        path.join(__dirname, "..", "..", "data", "words.json"), // dist/services/ → root
        path.join(__dirname, "..", "data", "words.json"), // dist/ → root
        path.join(__dirname, "data", "words.json"), // same dir
        path.join(process.cwd(), "data", "words.json"), // cwd fallback
      ];

      let raw: string | null = null;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          raw = fs.readFileSync(candidate, "utf-8");
          console.debug(`[WordService] Loaded words.json from: ${candidate}`);
          break;
        }
      }

      if (!raw) throw new Error("words.json not found in any candidate path");

      const parsed = JSON.parse(raw);

      // Support two formats:
      // 1. Flat array:  [{ word, language, category }, ...]
      // 2. Object:      { de: [{ word, category }, ...], en: [...] }
      if (Array.isArray(parsed)) {
        // Format 1: [{ word, language, category }, ...]
        this.words = parsed as WordEntry[];
      } else if (typeof parsed === "object" && parsed !== null) {
        const entries: WordEntry[] = [];
        for (const [lang, categoryMap] of Object.entries(parsed)) {
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
            // Format 3 (this file): { de: { Tiere: ["Katze", ...] }, en: { Animals: [...] } }
            for (const [category, wordList] of Object.entries(categoryMap)) {
              if (!Array.isArray(wordList)) continue;
              for (const word of wordList as string[]) {
                entries.push({ word, language: lang as Language, category });
              }
            }
          }
        }
        this.words = entries;
      } else {
        throw new Error("Unexpected words.json format");
      }
    } catch {
      console.warn(
        "[WordService] words.json not found or invalid, using built-in fallback",
      );
      this.words = FALLBACK_WORDS;
    }
    this.loaded = true;
  }

  static getCategories(language: Language): string[] {
    return CATEGORIES[language] ?? CATEGORIES["de"];
  }

  static getRandomWord(
    language: Language = "de",
    categories: string[] = [],
  ): string {
    this.load();

    const pool = this.words.filter(
      (w) =>
        w.language === language &&
        (categories.length === 0 || categories.includes(w.category)),
    );

    if (pool.length === 0) {
      // Fallback: ignore category filter
      const langPool = this.words.filter((w) => w.language === language);
      if (langPool.length === 0) return "Katze";
      return langPool[Math.floor(Math.random() * langPool.length)].word;
    }

    return pool[Math.floor(Math.random() * pool.length)].word;
  }
}

// ─── Built-in fallback words (used if words.json is missing) ─────────────────
const FALLBACK_WORDS: WordEntry[] = [
  // DE
  { word: "Katze", language: "de", category: "Tiere" },
  { word: "Hund", language: "de", category: "Tiere" },
  { word: "Elefant", language: "de", category: "Tiere" },
  { word: "Pizza", language: "de", category: "Essen & Trinken" },
  { word: "Fahrrad", language: "de", category: "Fahrzeuge" },
  { word: "Baum", language: "de", category: "Natur" },
  { word: "Haus", language: "de", category: "Objekte" },
  { word: "Arzt", language: "de", category: "Berufe" },
  { word: "Fußball", language: "de", category: "Sport" },
  { word: "Drache", language: "de", category: "Fantasy & Mythologie" },
  // EN
  { word: "Cat", language: "en", category: "Animals" },
  { word: "Dog", language: "en", category: "Animals" },
  { word: "Elephant", language: "en", category: "Animals" },
  { word: "Pizza", language: "en", category: "Food & Drinks" },
  { word: "Bicycle", language: "en", category: "Vehicles" },
  { word: "Tree", language: "en", category: "Nature" },
  { word: "House", language: "en", category: "Objects" },
  { word: "Doctor", language: "en", category: "Jobs" },
  { word: "Football", language: "en", category: "Sports" },
  { word: "Dragon", language: "en", category: "Fantasy & Mythology" },
];
