export interface VoiceSessionData {
  serverId: number;
  channelId: number;
  savedAt: number; // epoch ms
}

const KEY = 'dumcsi:lastVoiceSession';

export const VOICE_SESSION_MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes

export function saveVoiceSession(serverId: number, channelId: number): void {
  try {
    const data: VoiceSessionData = { serverId, channelId, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore persistence errors
  }
}

export function clearVoiceSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function getVoiceSession(): VoiceSessionData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VoiceSessionData;
    if (!parsed || typeof parsed.serverId !== 'number' || typeof parsed.channelId !== 'number' || typeof parsed.savedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSessionFresh(session: VoiceSessionData, maxAgeMs: number = VOICE_SESSION_MAX_AGE_MS): boolean {
  return Date.now() - session.savedAt <= maxAgeMs;
}

