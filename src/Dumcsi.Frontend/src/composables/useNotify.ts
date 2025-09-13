import { useNotificationCenter } from '@/stores/notificationCenter';

export function useNotify() {
  const nc = useNotificationCenter();
  return {
    notify: nc.notify,
    requestBrowserPermission: nc.requestBrowserPermission,
    prefs: nc.prefs,
    setCategoryEnabled: nc.setCategoryEnabled,
    setCategoryPlaySound: nc.setCategoryPlaySound,
    setCategoryRespectDnd: nc.setCategoryRespectDnd,
    setCategoryVolume: nc.setCategoryVolume,
    setBrowserEnabled: nc.setBrowserEnabled,
    setBrowserRespectDnd: nc.setBrowserRespectDnd,
  };
}

