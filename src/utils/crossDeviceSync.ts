import { AppSettings, CustomDua, DayData, TodoItem } from '../types';

export interface CrossDeviceSyncState {
  days: Record<string, DayData>;
  settings: AppSettings | null;
  todos: TodoItem[] | null;
  customDuas: CustomDua[] | null;
  updatedAt: number;
  revision: number;
  lastDeviceId?: string;
}

const DEVICE_ID: string = (() => {
  try {
    const existing = localStorage.getItem('tuko_sync_device_id') || sessionStorage.getItem('tuko_sync_device_id');
    if (existing) return existing;
    const created = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('tuko_sync_device_id', created);
    sessionStorage.setItem('tuko_sync_device_id', created);
    return created;
  } catch {
    return `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
})();

export function getSyncDeviceId(): string {
  return DEVICE_ID;
}

export interface PushSyncPayload {
  scope: string;
  isExplicitAction?: boolean;
  resetAll?: boolean;
  days?: Record<string, DayData>;
  dayUpdate?: { dateKey: string; dayData: DayData };
  settings?: AppSettings;
  todos?: TodoItem[];
  customDuas?: CustomDua[];
}

// Track active abort controllers so all network requests are immediately cancelled on page reload
const activeControllers = new Set<AbortController>();
let isUnloading = false;

if (typeof window !== 'undefined') {
  const abortAllOnUnload = () => {
    isUnloading = true;
    activeControllers.forEach((ctrl) => {
      try {
        ctrl.abort();
      } catch {}
    });
    activeControllers.clear();
  };
  window.addEventListener('beforeunload', abortAllOnUnload);
  window.addEventListener('pagehide', abortAllOnUnload);
}

// Track known server revisions per scope to avoid downloading unchanged payloads
const scopeRevisions = new Map<string, number>();

// Debounce queue per scope so rapid state updates batch into a single lightweight POST
const pendingPushMap = new Map<
  string,
  {
    payload: PushSyncPayload;
    timer: ReturnType<typeof setTimeout>;
    resolvers: Array<(res: CrossDeviceSyncState | null) => void>;
  }
>();

async function executePushSync(payload: PushSyncPayload): Promise<CrossDeviceSyncState | null> {
  if (typeof window === 'undefined' || isUnloading) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        deviceId: DEVICE_ID,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.revision === 'number') {
      scopeRevisions.set(payload.scope, data.revision);
    }
    return data?.state || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    activeControllers.delete(controller);
  }
}

export function pushSyncToServer(
  payload: PushSyncPayload
): Promise<CrossDeviceSyncState | null> {
  if (typeof window === 'undefined' || isUnloading) return Promise.resolve(null);

  // Immediate flush for resetAll
  if (payload.resetAll) {
    return executePushSync(payload);
  }

  const scope = payload.scope || 'default_shared';
  const existing = pendingPushMap.get(scope);

  if (existing) {
    clearTimeout(existing.timer);
    // Merge payload into existing batch
    const merged: PushSyncPayload = {
      ...existing.payload,
      ...payload,
      isExplicitAction: existing.payload.isExplicitAction || payload.isExplicitAction,
      days:
        existing.payload.days || payload.days
          ? { ...(existing.payload.days || {}), ...(payload.days || {}) }
          : undefined,
    };
    if (payload.dayUpdate && merged.days) {
      merged.days[payload.dayUpdate.dateKey] = payload.dayUpdate.dayData;
    }
    existing.payload = merged;

    return new Promise((resolve) => {
      existing.resolvers.push(resolve);
      existing.timer = setTimeout(async () => {
        pendingPushMap.delete(scope);
        const result = await executePushSync(existing.payload);
        existing.resolvers.forEach((r) => r(result));
      }, 280);
    });
  }

  return new Promise((resolve) => {
    const entry = {
      payload,
      resolvers: [resolve],
      timer: setTimeout(async () => {
        pendingPushMap.delete(scope);
        const result = await executePushSync(entry.payload);
        entry.resolvers.forEach((r) => r(result));
      }, 280),
    };
    pendingPushMap.set(scope, entry);
  });
}

export async function fetchSyncFromServer(
  scope: string,
  sinceRevision = -1
): Promise<CrossDeviceSyncState | null> {
  if (typeof window === 'undefined' || isUnloading) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `/api/sync?scope=${encodeURIComponent(scope)}&sinceRevision=${sinceRevision}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.revision === 'number') {
      scopeRevisions.set(scope, data.revision);
    }
    if (data?.unchanged) {
      return null;
    }
    return data?.state || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    activeControllers.delete(controller);
  }
}

export function subscribeCrossDeviceSync(
  scope: string,
  onStateReceived: (state: CrossDeviceSyncState, isInitial: boolean) => void,
  onStatusChange?: (status: 'connected' | 'syncing' | 'offline', lastSyncTime: number) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isDisposed = false;
  let lastSeenRevision = scopeRevisions.get(scope) ?? -1;
  let lastSeenUpdatedAt = 0;

  const processIncomingState = (
    state: CrossDeviceSyncState | null | undefined,
    isInitial = false,
    forceApply = false
  ) => {
    if (isDisposed || !state) return;

    const rev = Number(state.revision) || 0;
    const upAt = Number(state.updatedAt) || 0;

    if (forceApply || isInitial || rev > lastSeenRevision || upAt > lastSeenUpdatedAt) {
      const isFromSelf = !isInitial && !forceApply && state.lastDeviceId === DEVICE_ID;
      lastSeenRevision = Math.max(lastSeenRevision, rev);
      lastSeenUpdatedAt = Math.max(lastSeenUpdatedAt, upAt);
      scopeRevisions.set(scope, lastSeenRevision);
      onStatusChange?.('connected', Date.now());

      if (!isFromSelf) {
        onStateReceived(state, isInitial);
      }
    }
  };

  // 1. Defer initial sync (1500ms) so initial page boot & reload have 100% CPU & network priority
  const initialTimer = setTimeout(() => {
    if (isDisposed || isUnloading) return;
    fetchSyncFromServer(scope, -1).then((state) => {
      if (state) {
        processIncomingState(state, true, true);
      }
    });
  }, 1500);

  // 2. Scalable delta poll (every 15 seconds when visible) using ?sinceRevision=
  // If nothing changed, server responds with 50 bytes `{ unchanged: true }` — effortless for 1,000+ users!
  const pollInterval = setInterval(async () => {
    if (isDisposed || isUnloading || document.visibilityState === 'hidden') return;
    const state = await fetchSyncFromServer(scope, lastSeenRevision);
    if (state) {
      processIncomingState(state, false, false);
    }
  }, 15000);

  // 3. Sync when user unlocks screen or returns to tab (throttled to max once every 5s)
  let lastFocusCheck = 0;
  const handleVisibilityOrFocus = async () => {
    if (isDisposed || isUnloading || document.visibilityState === 'hidden') return;
    const now = Date.now();
    if (now - lastFocusCheck < 5000) return;
    lastFocusCheck = now;
    const state = await fetchSyncFromServer(scope, lastSeenRevision);
    if (state) {
      processIncomingState(state, false, true);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);
  window.addEventListener('online', handleVisibilityOrFocus);

  return () => {
    isDisposed = true;
    clearTimeout(initialTimer);
    clearInterval(pollInterval);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    window.removeEventListener('online', handleVisibilityOrFocus);
  };
}
