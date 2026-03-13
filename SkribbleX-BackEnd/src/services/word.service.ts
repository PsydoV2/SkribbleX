// src/services/word.service.ts
import fs from "fs";
import path from "path";

export type Language = "de" | "en";
export type WordMap = Record<Language, Record<string, string[]>>;

let wordMap: WordMap = { de: {}, en: {} };

function loadWords(): void {
  try {
    const filePath = path.resolve(__dirname, "../../data/words.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    wordMap = JSON.parse(raw);
    const total = Object.values(wordMap)
      .flatMap((lang) => Object.values(lang))
      .flat().length;
    console.log(`✅ WordService: ${total} Wörter geladen`);
  } catch (err) {
    console.error("❌ WordService: Fehler beim Laden:", err);
    wordMap = {
      de: { Allgemein: ["Katze", "Hund", "Haus", "Auto", "Baum"] },
      en: { General: ["Cat", "Dog", "House", "Car", "Tree"] },
    };
    console.warn("⚠️  WordService: Fallback-Wortliste aktiv");
  }
}

loadWords();

export class WordService {
  // Alle verfügbaren Kategorien für eine Sprache
  static getCategories(language: Language): string[] {
    return Object.keys(wordMap[language] ?? {});
  }

  // Zufälliges Wort aus den gewählten Kategorien + Sprache
  static getRandomWord(language: Language, categories: string[]): string {
    const pool = categories.flatMap((cat) => wordMap[language]?.[cat] ?? []);

    if (pool.length === 0) {
      // Fallback: alle Kategorien der Sprache
      const fallback = Object.values(wordMap[language] ?? {}).flat();
      return fallback[Math.floor(Math.random() * fallback.length)] ?? "???";
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  static reload(): void {
    loadWords();
  }
}
