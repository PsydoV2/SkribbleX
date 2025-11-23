// src/services/WordService.ts

export class WordService {
  private static words = ["Katze", "Baum", "Haus", "Auto", "Hund", "Pizza"];

  static getRandomWord(): string {
    const index = Math.floor(Math.random() * this.words.length);
    return this.words[index];
  }
}
