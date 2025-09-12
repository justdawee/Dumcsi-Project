import {defineStore} from 'pinia';

type EpochMs = number; // -1 means until turned back on

interface MuteState {
  channels: Record<string, EpochMs>; // key: `${serverId}:${channelId}`
  servers: Record<string, EpochMs>; // key: `${serverId}`
  dms: Record<string, EpochMs>;     // key: `${userId}`
}

const STORAGE_KEY = 'dumcsi-notification-mutes-v1';

function now(): number { return Date.now(); }
function isActive(expiry: EpochMs): boolean { return expiry === -1 || expiry > now(); }

function loadState(): MuteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MuteState;
      return parsed || { channels: {}, servers: {}, dms: {} };
    }
  } catch {}
  return { channels: {}, servers: {}, dms: {} };
}

function saveState(state: MuteState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export const useNotificationPrefs = defineStore('notificationPrefs', () => {
  const state: MuteState = loadState();

  const cleanupExpired = () => {
    const t = now();
    let changed = false;
    for (const [k, v] of Object.entries(state.channels)) {
      if (v !== -1 && v <= t) { delete state.channels[k]; changed = true; }
    }
    for (const [k, v] of Object.entries(state.servers)) {
      if (v !== -1 && v <= t) { delete state.servers[k]; changed = true; }
    }
    for (const [k, v] of Object.entries(state.dms)) {
      if (v !== -1 && v <= t) { delete state.dms[k]; changed = true; }
    }
    if (changed) saveState(state);
  };

  const keyForChannel = (serverId: number, channelId: number) => `${serverId}:${channelId}`;

  const muteUntil = (msFromNow: number | 'forever') => (msFromNow === 'forever' ? -1 : now() + msFromNow);

  const muteServer = (serverId: number, msFromNow: number | 'forever') => {
    state.servers[String(serverId)] = muteUntil(msFromNow);
    saveState(state);
  };
  const unmuteServer = (serverId: number) => { delete state.servers[String(serverId)]; saveState(state); };
  const isServerMuted = (serverId?: number) => {
    cleanupExpired();
    if (!serverId && serverId !== 0) return false;
    const v = state.servers[String(serverId)];
    return typeof v === 'number' && isActive(v);
  };

  const muteChannel = (serverId: number, channelId: number, msFromNow: number | 'forever') => {
    state.channels[keyForChannel(serverId, channelId)] = muteUntil(msFromNow);
    saveState(state);
  };
  const unmuteChannel = (serverId: number, channelId: number) => {
    delete state.channels[keyForChannel(serverId, channelId)];
    saveState(state);
  };
  const isChannelMuted = (serverId?: number, channelId?: number) => {
    cleanupExpired();
    if (serverId === undefined || channelId === undefined) return false;
    if (isServerMuted(serverId)) return true;
    const v = state.channels[keyForChannel(serverId, channelId)];
    return typeof v === 'number' && isActive(v);
  };

  const muteDm = (userId: number, msFromNow: number | 'forever') => {
    state.dms[String(userId)] = muteUntil(msFromNow);
    saveState(state);
  };
  const unmuteDm = (userId: number) => { delete state.dms[String(userId)]; saveState(state); };
  const isDmMuted = (userId?: number) => {
    cleanupExpired();
    if (userId === undefined) return false;
    const v = state.dms[String(userId)];
    return typeof v === 'number' && isActive(v);
  };

  const shouldSuppress = (meta?: { serverId?: number; channelId?: number; dmUserId?: number }): boolean => {
    cleanupExpired();
    if (!meta) return false;
    if (meta.dmUserId && isDmMuted(meta.dmUserId)) return true;
    if (meta.serverId && isServerMuted(meta.serverId)) return true;
    if (meta.serverId && meta.channelId && isChannelMuted(meta.serverId, meta.channelId)) return true;
    return false;
  };

  const Durations = {
    m15: 15 * 60 * 1000,
    h1: 60 * 60 * 1000,
    h3: 3 * 60 * 60 * 1000,
    h8: 8 * 60 * 60 * 1000,
    h24: 24 * 60 * 60 * 1000,
  } as const;

  return {
    // Mute APIs
    muteServer,
    unmuteServer,
    isServerMuted,
    muteChannel,
    unmuteChannel,
    isChannelMuted,
    muteDm,
    unmuteDm,
    isDmMuted,
    // Suppression check
    shouldSuppress,
    // Common durations
    Durations,
  };
});
