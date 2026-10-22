import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SYNC_FILE_PATH = path.join(__dirname, '.aistudio', 'cross_device_sync.json');
const MAX_SCOPES_IN_MEMORY = 2500;

interface SyncScopeState {
  days: Record<string, any>;
  settings: any | null;
  todos: any[] | null;
  customDuas: any[] | null;
  updatedAt: number;
  revision: number;
  lastDeviceId?: string;
}

interface SyncStoreFile {
  activeScope: string;
  scopes: Record<string, SyncScopeState>;
}

function createEmptyScope(): SyncScopeState {
  return {
    days: {},
    settings: null,
    todos: null,
    customDuas: null,
    updatedAt: 0,
    revision: 0,
  };
}

function loadSyncStore(): SyncStoreFile {
  try {
    if (fs.existsSync(SYNC_FILE_PATH)) {
      const raw = fs.readFileSync(SYNC_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.scopes) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load sync store:', err);
  }
  return {
    activeScope: 'default_shared',
    scopes: {
      default_shared: createEmptyScope(),
    },
  };
}

const syncStore: SyncStoreFile = loadSyncStore();

// Asynchronous, debounced disk persistence so HTTP requests and Vite module loads NEVER block on disk I/O
let persistTimer: NodeJS.Timeout | null = null;
let isPersisting = false;
let pendingPersist = false;

async function flushSyncStoreToDisk(): Promise<void> {
  if (isPersisting) {
    pendingPersist = true;
    return;
  }
  isPersisting = true;
  try {
    const dir = path.dirname(SYNC_FILE_PATH);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const serialized = JSON.stringify(syncStore);
    await fs.promises.writeFile(SYNC_FILE_PATH, serialized, 'utf-8');
  } catch (err) {
    console.error('Failed to persist sync store:', err);
  } finally {
    isPersisting = false;
    if (pendingPersist) {
      pendingPersist = false;
      schedulePersistSyncStore();
    }
  }
}

function schedulePersistSyncStore(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushSyncStoreToDisk().catch(() => {});
  }, 2000);
}

// Prune oldest scopes if > MAX_SCOPES_IN_MEMORY to guarantee bounded RAM for 1,000+ concurrent users
function pruneScopesIfNeeded(): void {
  const keys = Object.keys(syncStore.scopes);
  if (keys.length <= MAX_SCOPES_IN_MEMORY) return;
  const sorted = keys
    .filter((k) => k !== 'default_shared')
    .sort((a, b) => (syncStore.scopes[a]?.updatedAt || 0) - (syncStore.scopes[b]?.updatedAt || 0));
  const toRemove = sorted.slice(0, keys.length - MAX_SCOPES_IN_MEMORY);
  for (const k of toRemove) {
    delete syncStore.scopes[k];
  }
}

function isDayMeaningful(day: any): boolean {
  if (!day || typeof day !== 'object') return false;
  if (day.isExcusedDay) return true;
  if (day.soon) return true;
  if (Number(day.quran) > 0) return true;
  if (Array.isArray(day.quranSurahs) && day.quranSurahs.length > 0) return true;
  if (Number(day.tasbeehCount) > 0) return true;
  if (day.fridayKahfRead) return true;
  if (Number(day.fridaySalawatCount) > 0) return true;
  if (day.adhkar && Object.values(day.adhkar).some(Boolean)) return true;
  if (day.customDuasCompleted && Object.values(day.customDuasCompleted).some(Boolean)) return true;
  if (day.salaah && typeof day.salaah === 'object') {
    for (const rec of Object.values(day.salaah) as any[]) {
      if (rec && rec.status && rec.status !== 'none') return true;
      if (rec && rec.reason && String(rec.reason).trim().length > 0) return true;
    }
  }
  return false;
}

// Connected SSE clients scoped strictly to their own user/device scope
const sseClients = new Set<{
  res: express.Response;
  scope: string;
}>();

function broadcastScopeUpdate(scope: string, state: SyncScopeState) {
  if (sseClients.size === 0) return;
  const payload = `data: ${JSON.stringify({
    scope,
    state,
    serverTime: Date.now(),
  })}\n\n`;

  for (const client of sseClients) {
    if (client.scope === scope) {
      try {
        client.res.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }
}

function resolveEffectiveScope(requestedScope?: string): string {
  const cleaned = String(requestedScope || '').trim();
  if (!cleaned || cleaned === 'guest') {
    return 'default_shared';
  }
  // Sanitize scope key length for safety
  return cleaned.slice(0, 128);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Lightweight health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeScopes: Object.keys(syncStore.scopes).length });
  });

  // 1. Real-Time SSE Stream for instant cross-device updates within the same user scope
  app.get('/api/sync/stream', (req, res) => {
    const scope = resolveEffectiveScope(String(req.query.scope || 'default_shared'));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const currentScopeState = syncStore.scopes[scope] || createEmptyScope();
    res.write(
      `data: ${JSON.stringify({
        scope,
        state: currentScopeState,
        serverTime: Date.now(),
      })}\n\n`
    );

    const clientEntry = { res, scope };
    sseClients.add(clientEntry);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(clientEntry);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(clientEntry);
    });
  });

  // 2. GET current synced state (supports lightweight revision check via ?sinceRevision=)
  app.get('/api/sync', (req, res) => {
    const scope = resolveEffectiveScope(String(req.query.scope || 'default_shared'));
    const sinceRevision = Number(req.query.sinceRevision ?? -1);
    const target = syncStore.scopes[scope] || createEmptyScope();

    res.setHeader('Cache-Control', 'no-store');

    // If client already has the latest revision, return a tiny 50-byte payload instead of full history!
    if (sinceRevision >= 0 && target.revision === sinceRevision) {
      res.json({
        scope,
        unchanged: true,
        revision: target.revision,
        updatedAt: target.updatedAt,
        serverTime: Date.now(),
      });
      return;
    }

    res.json({
      scope,
      unchanged: false,
      state: target,
      serverTime: Date.now(),
    });
  });

  // 3. POST update to synced state (isolated per user scope, non-blocking persistence)
  app.post('/api/sync', (req, res) => {
    const {
      scope: rawScope,
      deviceId,
      isExplicitAction,
      resetAll,
      days,
      dayUpdate,
      settings,
      todos,
      customDuas,
    } = req.body || {};

    const scope = resolveEffectiveScope(rawScope);
    if (!syncStore.scopes[scope]) {
      pruneScopesIfNeeded();
      syncStore.scopes[scope] = createEmptyScope();
    }

    const target = syncStore.scopes[scope];
    let hasChanges = false;
    const now = Date.now();

    if (resetAll) {
      target.days = days && typeof days === 'object' ? days : {};
      target.settings = settings || null;
      target.todos = Array.isArray(todos) ? todos : null;
      target.customDuas = Array.isArray(customDuas) ? customDuas : null;
      target.updatedAt = now;
      target.revision += 1;
      target.lastDeviceId = deviceId;
      hasChanges = true;
    } else {
      // Single day explicit update
      if (dayUpdate && dayUpdate.dateKey && dayUpdate.dayData) {
        const { dateKey, dayData } = dayUpdate;
        target.days[dateKey] = {
          ...dayData,
          updatedAt: dayData.updatedAt || now,
        };
        hasChanges = true;
      }

      // Bulk days merge
      if (days && typeof days === 'object') {
        for (const [dKey, incomingDay] of Object.entries(days)) {
          if (!incomingDay || typeof incomingDay !== 'object') continue;
          const existingDay = target.days[dKey];

          if (!existingDay) {
            if (isExplicitAction || isDayMeaningful(incomingDay) || Object.keys(target.days).length === 0) {
              target.days[dKey] = {
                ...incomingDay,
                updatedAt: (incomingDay as any).updatedAt || now,
              };
              hasChanges = true;
            }
          } else {
            const incomingTs = Number((incomingDay as any).updatedAt) || 0;
            const existingTs = Number(existingDay.updatedAt) || 0;
            const incomingMeaningful = isDayMeaningful(incomingDay);
            const existingMeaningful = isDayMeaningful(existingDay);

            if (isExplicitAction && incomingTs >= existingTs) {
              target.days[dKey] = {
                ...incomingDay,
                updatedAt: incomingTs || now,
              };
              hasChanges = true;
            } else if (!existingMeaningful && incomingMeaningful) {
              target.days[dKey] = {
                ...incomingDay,
                updatedAt: incomingTs || now,
              };
              hasChanges = true;
            } else if (incomingMeaningful && incomingTs > existingTs) {
              target.days[dKey] = {
                ...incomingDay,
                updatedAt: incomingTs,
              };
              hasChanges = true;
            }
          }
        }
      }

      // Settings update
      if (settings && typeof settings === 'object') {
        const incomingTs = Number(settings.updatedAt) || 0;
        const existingTs = Number(target.settings?.updatedAt) || 0;
        if (isExplicitAction || !target.settings || incomingTs > existingTs) {
          target.settings = {
            ...(target.settings || {}),
            ...settings,
            updatedAt: isExplicitAction ? now : incomingTs || now,
          };
          hasChanges = true;
        }
      }

      // Todos update
      if (Array.isArray(todos)) {
        if (isExplicitAction || !target.todos) {
          target.todos = todos;
          hasChanges = true;
        }
      }

      // Custom Duas update
      if (Array.isArray(customDuas)) {
        if (isExplicitAction || !target.customDuas) {
          target.customDuas = customDuas;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        target.updatedAt = now;
        target.revision += 1;
        target.lastDeviceId = deviceId;
      }
    }

    if (hasChanges) {
      schedulePersistSyncStore();
      broadcastScopeUpdate(scope, target);
    }

    res.json({
      ok: true,
      scope,
      revision: target.revision,
      updatedAt: target.updatedAt,
      state: target,
      serverTime: now,
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const isProdOrCloudRun =
    process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);

  if (!isProdOrCloudRun || !fs.existsSync(path.join(distPath, 'index.html'))) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tuko High-Concurrency Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
