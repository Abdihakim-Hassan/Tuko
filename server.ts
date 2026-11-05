import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SYNC_FILE_PATH = path.join(__dirname, '.aistudio', 'cross_device_sync.json');
const MAX_SCOPES_IN_MEMORY = 1000;
const MAX_DAYS_PER_SCOPE = 400;
const FIREBASE_PROJECT_ID = 'galvanized-ripple-5b34d';
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeKey(key: string): boolean {
  return Boolean(key) && typeof key === 'string' && !DANGEROUS_KEYS.has(key);
}

function isValidDateKey(key: string): boolean {
  return isSafeKey(key) && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function sanitizePlainObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {} as T;
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!isSafeKey(k)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = sanitizePlainObject(v);
    } else {
      clean[k] = v;
    }
  }
  return clean as T;
}

function decodeFirebaseUidFromBearer(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    if (!payload || typeof payload !== 'object') return null;
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 60000) return null;
    const uid = payload.user_id || payload.sub;
    return typeof uid === 'string' && uid.length > 0 ? uid : null;
  } catch {
    return null;
  }
}

function verifyScopeAuthorization(req: express.Request, scope: string): boolean {
  if (scope.startsWith('user_')) {
    const expectedUid = scope.slice(5);
    const tokenUid = decodeFirebaseUidFromBearer(req.headers.authorization);
    return Boolean(expectedUid && tokenUid && tokenUid === expectedUid);
  }
  if (scope.startsWith('guest_')) {
    const expectedDevice = scope.slice(6);
    const headerDevice = String(
      req.headers['x-tuko-device-id'] || req.query.deviceId || req.body?.deviceId || ''
    ).trim();
    return Boolean(expectedDevice && headerDevice && expectedDevice === headerDevice);
  }
  return false;
}

// Simple in-memory IP Rate Limiter (120 req/min per IP)
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxPerMin = 120): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    if (ipRateMap.size > 5000) ipRateMap.clear();
    ipRateMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxPerMin;
}

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

function resolveEffectiveScope(requestedScope?: string, deviceId?: string): string {
  const cleaned = String(requestedScope || '').trim();
  if (cleaned.startsWith('user_') && isSafeKey(cleaned)) {
    return cleaned.slice(0, 128);
  }
  if (cleaned.startsWith('guest_') && isSafeKey(cleaned)) {
    return cleaned.slice(0, 128);
  }
  const fallbackDevice = String(deviceId || 'local').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 48);
  return `guest_${fallbackDevice || 'default'}`;
}

async function startServer() {
  const app = express();

  // Standard Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Limit body payload to prevent memory flooding
  app.use(express.json({ limit: '1mb' }));

  // API Rate Limiter
  app.use('/api/', (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 150)) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  });

  // Lightweight health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeScopes: Object.keys(syncStore.scopes).length });
  });

  // Explicit PWA Manifest, Service Worker, & App Logo Icon routes
  const publicDir = path.join(__dirname, 'public');
  app.get('/manifest.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(path.join(publicDir, 'manifest.json'));
  });

  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(publicDir, 'sw.js'));
  });

  const pwaIconFiles: Record<string, string> = {
    '/pwa-192x192.png': 'image/png',
    '/pwa-512x512.png': 'image/png',
    '/pwa-maskable-192x192.png': 'image/png',
    '/pwa-maskable-512x512.png': 'image/png',
    '/apple-touch-icon.png': 'image/png',
    '/favicon.png': 'image/png',
    '/favicon.ico': 'image/png',
    '/icon.svg': 'image/svg+xml',
  };

  for (const [routePath, mimeType] of Object.entries(pwaIconFiles)) {
    app.get(routePath, (_req, res) => {
      const filePath = path.join(publicDir, routePath.slice(1));
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(filePath);
      } else {
        res.status(404).end();
      }
    });
  }

  // 1. Real-Time SSE Stream for instant cross-device updates within the same user scope
  app.get('/api/sync/stream', (req, res) => {
    const rawScope = String(req.query.scope || '');
    const deviceId = String(req.query.deviceId || '');
    const scope = resolveEffectiveScope(rawScope, deviceId);

    if (!verifyScopeAuthorization(req, scope)) {
      return res.status(403).json({ error: 'Unauthorized scope access.' });
    }

    if (sseClients.size > 200) {
      return res.status(503).json({ error: 'Server busy. Please poll instead.' });
    }

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
    const rawScope = String(req.query.scope || '');
    const deviceId = String(req.query.deviceId || '');
    const scope = resolveEffectiveScope(rawScope, deviceId);

    if (!verifyScopeAuthorization(req, scope)) {
      return res.status(403).json({ error: 'Unauthorized scope access.' });
    }

    const sinceRevision = Number(req.query.sinceRevision ?? -1);
    const target = syncStore.scopes[scope] || createEmptyScope();

    res.setHeader('Cache-Control', 'no-store');

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

    const scope = resolveEffectiveScope(rawScope, deviceId);

    if (!verifyScopeAuthorization(req, scope)) {
      return res.status(403).json({ error: 'Unauthorized scope access.' });
    }

    if (!syncStore.scopes[scope]) {
      pruneScopesIfNeeded();
      syncStore.scopes[scope] = createEmptyScope();
    }

    const target = syncStore.scopes[scope];
    let hasChanges = false;
    const now = Date.now();

    if (resetAll) {
      const cleanDays: Record<string, any> = {};
      if (days && typeof days === 'object' && !Array.isArray(days)) {
        for (const [k, v] of Object.entries(days)) {
          if (isValidDateKey(k) && v && typeof v === 'object') {
            cleanDays[k] = sanitizePlainObject(v);
          }
        }
      }
      target.days = cleanDays;
      target.settings = settings && typeof settings === 'object' ? sanitizePlainObject(settings) : null;
      target.todos = Array.isArray(todos) ? todos.slice(0, 200).map((t) => sanitizePlainObject(t)) : null;
      target.customDuas = Array.isArray(customDuas) ? customDuas.slice(0, 100).map((d) => sanitizePlainObject(d)) : null;
      target.updatedAt = now;
      target.revision += 1;
      target.lastDeviceId = typeof deviceId === 'string' ? deviceId.slice(0, 64) : undefined;
      hasChanges = true;
    } else {
      // Single day explicit update
      if (dayUpdate && isValidDateKey(dayUpdate.dateKey) && dayUpdate.dayData && typeof dayUpdate.dayData === 'object') {
        const { dateKey, dayData } = dayUpdate;
        target.days[dateKey] = {
          ...sanitizePlainObject(dayData),
          updatedAt: Number(dayData.updatedAt) || now,
        };
        hasChanges = true;
      }

      // Bulk days merge (with validation against prototype pollution & invalid keys)
      if (days && typeof days === 'object' && !Array.isArray(days)) {
        let dayCount = Object.keys(target.days).length;
        for (const [dKey, incomingDay] of Object.entries(days)) {
          if (!isValidDateKey(dKey) || !incomingDay || typeof incomingDay !== 'object') continue;
          if (dayCount > MAX_DAYS_PER_SCOPE) break;

          const existingDay = target.days[dKey];
          const sanitizedIncoming = sanitizePlainObject(incomingDay);

          if (!existingDay) {
            if (isExplicitAction || isDayMeaningful(sanitizedIncoming) || Object.keys(target.days).length === 0) {
              target.days[dKey] = {
                ...sanitizedIncoming,
                updatedAt: (sanitizedIncoming as any).updatedAt || now,
              };
              dayCount++;
              hasChanges = true;
            }
          } else {
            const incomingTs = Number((sanitizedIncoming as any).updatedAt) || 0;
            const existingTs = Number(existingDay.updatedAt) || 0;
            const incomingMeaningful = isDayMeaningful(sanitizedIncoming);
            const existingMeaningful = isDayMeaningful(existingDay);

            if (isExplicitAction && incomingTs >= existingTs) {
              target.days[dKey] = {
                ...sanitizedIncoming,
                updatedAt: incomingTs || now,
              };
              hasChanges = true;
            } else if (!existingMeaningful && incomingMeaningful) {
              target.days[dKey] = {
                ...sanitizedIncoming,
                updatedAt: incomingTs || now,
              };
              hasChanges = true;
            } else if (incomingMeaningful && incomingTs > existingTs) {
              target.days[dKey] = {
                ...sanitizedIncoming,
                updatedAt: incomingTs,
              };
              hasChanges = true;
            }
          }
        }
      }

      // Settings update
      if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
        const cleanSettings = sanitizePlainObject(settings);
        const incomingTs = Number(cleanSettings.updatedAt) || 0;
        const existingTs = Number(target.settings?.updatedAt) || 0;
        if (isExplicitAction || !target.settings || incomingTs > existingTs) {
          target.settings = {
            ...(target.settings || {}),
            ...cleanSettings,
            updatedAt: isExplicitAction ? now : incomingTs || now,
          };
          hasChanges = true;
        }
      }

      // Todos update
      if (Array.isArray(todos)) {
        if (isExplicitAction || !target.todos) {
          target.todos = todos.slice(0, 200).map((t) => sanitizePlainObject(t));
          hasChanges = true;
        }
      }

      // Custom Duas update
      if (Array.isArray(customDuas)) {
        if (isExplicitAction || !target.customDuas) {
          target.customDuas = customDuas.slice(0, 100).map((d) => sanitizePlainObject(d));
          hasChanges = true;
        }
      }

      if (hasChanges) {
        target.updatedAt = now;
        target.revision += 1;
        target.lastDeviceId = typeof deviceId === 'string' ? deviceId.slice(0, 64) : undefined;
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
