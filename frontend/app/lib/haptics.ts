/**
 * Haptics & Feedback — iOS Vibration and audio cues
 *
 * Uses the Vibration API for tactile feedback and AudioContext
 * for subtle sound effects on message events.
 */

// ---------------------------------------------------------------------------
// Haptic Feedback
// ---------------------------------------------------------------------------

/**
 * Light tap — for button presses, send actions.
 */
export function tapLight(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

/**
 * Medium tap — for message received.
 */
export function tapMedium(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(20);
  }
}

/**
 * Success pattern — for connection established, session ready.
 */
export function tapSuccess(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([10, 50, 10]);
  }
}

/**
 * Error pattern — for connection lost, failures.
 */
export function tapError(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([30, 30, 30]);
  }
}

// ---------------------------------------------------------------------------
// Audio Feedback
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Soft "pop" sound — new message received.
 */
export function soundPop(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

/**
 * Soft "send" whoosh — message sent.
 */
export function soundSend(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * Connection chime — connected successfully.
 */
export function soundConnect(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;

    const start = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

    osc.start(start);
    osc.stop(start + 0.15);
  });
}
