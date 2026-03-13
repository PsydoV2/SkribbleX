// tests/__mocks__/nanoid.ts
// Ersetzt nanoid im Test-Kontext mit einer simplen CJS-kompatiblen Version

let counter = 0;

export const nanoid = () => `nanoid-${++counter}`;

export const customAlphabet = (_alphabet: string, _size: number) => {
  return () => `room-${++counter}`;
};
