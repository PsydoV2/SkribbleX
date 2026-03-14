// src/lib/sounds.ts
// Programmatic sounds via Web Audio API — no external files needed

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.25,
  delay = 0,
): void {
  const c = getCtx();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + delay);

  gain.gain.setValueAtTime(0, c.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.05);
}

/** Kurzes freudiges Ding — Spieler hat richtig geraten */
export function playCorrectGuess(): void {
  playTone(523, 0.12, "sine", 0.3);         // C5
  playTone(659, 0.12, "sine", 0.3, 0.12);   // E5
  playTone(784, 0.2,  "sine", 0.3, 0.24);   // G5
}

/** Freudiges Fanfare — du selbst hast richtig geraten */
export function playOwnCorrectGuess(): void {
  playTone(523, 0.1, "sine", 0.35);
  playTone(659, 0.1, "sine", 0.35, 0.1);
  playTone(784, 0.1, "sine", 0.35, 0.2);
  playTone(1047, 0.25, "sine", 0.35, 0.3);  // C6
}

/** Kurzes Plopp — Runde startet / Wort ausgewählt */
export function playRoundStart(): void {
  playTone(440, 0.08, "square", 0.15);
  playTone(880, 0.15, "sine",   0.2, 0.08);
}

/** Sanftes Gong — Rundenende */
export function playRoundEnd(): void {
  playTone(330, 0.5, "sine", 0.2);
  playTone(247, 0.6, "sine", 0.15, 0.15);
}

/** Tick — Timer unter 10s */
export function playTimerTick(): void {
  playTone(880, 0.06, "square", 0.08);
}

/** Sanftes Pop — Chat-Nachricht / Spieler tritt bei */
export function playNotification(): void {
  playTone(660, 0.1, "sine", 0.12);
}
