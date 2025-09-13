// Lightweight chime generator using Web Audio API (no assets needed)
// Different tones for categories; envelope to avoid clicks.

type ToneKind =
  | 'server'
  | 'dm'
  | 'toast'
  | 'friend'
  | 'voice-join'
  | 'voice-leave'
  | 'voice-other-join'
  | 'screen-start'
  | 'screen-stop'
  | 'mic-mute'
  | 'mic-unmute'
  | 'deafen-on'
  | 'deafen-off';

const FREQUENCIES: Record<ToneKind, [number, number]> = {
  server: [880, 660], // high-low
  dm: [660, 880],     // low-high
  toast: [780, 780],  // single tone
  friend: [820, 1020],
  'voice-join': [520, 740],
  'voice-leave': [740, 520],
  'voice-other-join': [600, 900],
  'screen-start': [900, 900],
  'screen-stop': [520, 520],
  'mic-mute': [480, 360],
  'mic-unmute': [360, 480],
  'deafen-on': [300, 300],
  'deafen-off': [300, 450],
};

export async function playChime(kind: ToneKind, volume: number = 0.8): Promise<void> {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    gain.connect(ctx.destination);

    const [f1, f2] = FREQUENCIES[kind] || FREQUENCIES.toast;

    // Two quick notes sequence
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = f1;
    osc1.connect(gain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = f2;
    osc2.connect(gain);

    const now = ctx.currentTime;
    const dur = 0.08; // 80ms each
    const gap = 0.02;

    // Envelope to avoid clicks
    const attack = 0.005;
    const release = 0.06;

    const g = gain.gain;
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(volume, now + attack);
    g.linearRampToValueAtTime(0.0001, now + dur - release);

    osc1.start(now);
    osc1.stop(now + dur);

    // Second note envelope
    g.setValueAtTime(0, now + dur + gap);
    g.linearRampToValueAtTime(volume, now + dur + gap + attack);
    g.linearRampToValueAtTime(0.0001, now + 2 * dur + gap - release);

    osc2.start(now + dur + gap);
    osc2.stop(now + 2 * dur + gap);

    // Cleanup
    osc2.onended = () => {
      try { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); ctx.close(); } catch {}
    };
  } catch {
    // ignore audio failures
  }
}
