/**
 * F161: tickets that appeared since the previous load. The first load seeds the set and
 * reports nothing, so opening the screen never alerts for tickets already waiting.
 */
export function arrivedTickets<T extends { id: string }>(
  seen: ReadonlySet<string> | null,
  tickets: readonly T[],
): T[] {
  if (seen === null) return [];
  return tickets.filter((ticket) => !seen.has(ticket.id));
}

/** A short two-tone chime through Web Audio; silently does nothing where audio is unavailable. */
export function playChime(): void {
  try {
    const AudioCtor =
      (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    [880, 1320].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.18 + 0.16,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    /* Audio is optional; the visible alert is the main signal. */
  }
}
