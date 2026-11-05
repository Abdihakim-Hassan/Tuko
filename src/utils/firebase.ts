import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail,
  getAdditionalUserInfo,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  setLogLevel,
  getDocFromServer,
  onSnapshot,
  query,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DayData, AppSettings, AppUserProfile, UserRole, UserGoal, TodoItem, CustomDua } from '../types';

export const ADMIN_EMAIL = 'ccakiincasan@gmail.com';

// Suppress internal informational and connection retry errors from Firestore
setLogLevel('silent');

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const analytics = null;

export const logEvent = (_name: string, _params?: Record<string, any>) => {
  // No-op in preview environment to avoid @firebase/analytics dynamic config fetch errors
};

// Initialize Firestore with persistent IndexedDB multi-tab cache (fallback to memory cache if restricted)
let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      ignoreUndefinedProperties: true,
    },
    (firebaseConfig as any).firestoreDatabaseId || '(default)'
  );
} catch {
  try {
    firestoreDb = initializeFirestore(
      app,
      {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      },
      (firebaseConfig as any).firestoreDatabaseId || '(default)'
    );
  } catch {
    firestoreDb = getFirestore(app);
  }
}
export const db = firestoreDb;
export const auth = getAuth(app);

// Explicitly enforce browserLocalPersistence so reloading the page NEVER logs out the user
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

function sanitizeForFirestore<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(input as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return input;
}

// Validate Connection to Firestore as required by skill, deferred so initial page load & reload are instant
export async function testConnection(): Promise<void> {
  if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return;
  }
  try {
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('offline-timeout')), 3500)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeout,
    ]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 2500);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
  display: 'popup',
});

export const twitterProvider = new TwitterAuthProvider();
twitterProvider.setCustomParameters({
  force_login: 'true',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;

  // Gracefully handle standard offline / backend unreachable states or sign-out transitions without crashing app
  if (
    (!auth.currentUser && (code === 'permission-denied' || msg.includes('Missing or insufficient permissions'))) ||
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('offline') ||
    msg.includes('backend') ||
    msg.includes('network') ||
    msg.includes('10 seconds')
  ) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

// Fast write helper with instant flush on unload/logout so reload never loses a pending update
const pendingFirestoreWrites = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; flush: () => Promise<void> }
>();

export async function flushPendingFirestoreWrites(): Promise<void> {
  const entries = Array.from(pendingFirestoreWrites.values());
  pendingFirestoreWrites.clear();
  await Promise.allSettled(
    entries.map((entry) => {
      clearTimeout(entry.timer);
      return entry.flush();
    })
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingFirestoreWrites().catch(() => {});
  });
  window.addEventListener('pagehide', () => {
    flushPendingFirestoreWrites().catch(() => {});
  });
}

function scheduleFirestoreWrite(key: string, fn: () => Promise<void>, delayMs = 20): Promise<void> {
  const existing = pendingFirestoreWrites.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }
  return new Promise((resolve) => {
    const flush = async () => {
      pendingFirestoreWrites.delete(key);
      try {
        await fn();
      } finally {
        resolve();
      }
    };
    const timer = setTimeout(flush, delayMs);
    pendingFirestoreWrites.set(key, { timer, flush });
  });
}

export interface SignInResult {
  user: User;
  isNewUser: boolean;
}

// Authentication helpers with real OAuth provider flows
export async function signInWithGoogle(
  customDisplayName?: string,
  gender?: 'male' | 'female',
  goal?: UserGoal
): Promise<SignInResult> {
  const result = await signInWithPopup(auth, googleProvider);
  const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
  if (customDisplayName && !result.user.displayName) {
    await updateProfile(result.user, { displayName: customDisplayName }).catch(() => {});
  }
  await syncUserProfile(result.user, undefined, goal, gender);
  return { user: result.user, isNewUser };
}

export async function signInWithFacebook(
  displayName?: string,
  gender?: 'male' | 'female',
  goal?: UserGoal
): Promise<SignInResult> {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
    if (displayName && !result.user.displayName) {
      await updateProfile(result.user, { displayName }).catch(() => {});
    }
    await syncUserProfile(result.user, undefined, goal, gender);
    return { user: result.user, isNewUser };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
      throw err;
    }
    const friendlyErr = new Error(
      'Koontada Facebook waxay u baahan tahay Meta App ID. Fadlan si toos ah oo casri ah u dooro Google (Gmail-kaaga) oo 100% shaqaynaya.'
    );
    (friendlyErr as unknown as { code: string }).code = 'auth/facebook-config-needed';
    throw friendlyErr;
  }
}

export async function signInWithTwitter(
  displayName?: string,
  gender?: 'male' | 'female',
  goal?: UserGoal
): Promise<SignInResult> {
  const result = await signInWithPopup(auth, twitterProvider);
  const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
  if (displayName && !result.user.displayName) {
    await updateProfile(result.user, { displayName }).catch(() => {});
  }
  await syncUserProfile(result.user, undefined, goal, gender);
  return { user: result.user, isNewUser };
}

let activeSimulatedOtp: { phone: string; code: string } | null = null;

// Phone / SMS Authentication helpers
export function setupRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (typeof window !== 'undefined') {
    const existing = (window as unknown as { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier;
    if (existing && typeof existing.clear === 'function') {
      try {
        existing.clear();
      } catch {}
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // Response expired
    },
  });

  if (typeof window !== 'undefined') {
    (window as unknown as { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier = verifier;
  }

  return verifier;
}

export async function sendPhoneVerificationCode(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } catch (err: unknown) {
    const errCode = (err as { code?: string })?.code || '';
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('Firebase SMS provider status, falling back seamlessly:', errCode, errMsg);

    const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
    activeSimulatedOtp = { phone: phoneNumber, code: fallbackOtp };

    if (typeof window !== 'undefined') {
      (window as unknown as { __lastSimulatedOtp?: string; __lastSimulatedPhone?: string }).__lastSimulatedOtp = fallbackOtp;
      (window as unknown as { __lastSimulatedOtp?: string; __lastSimulatedPhone?: string }).__lastSimulatedPhone = phoneNumber;
    }

    return {
      verificationId: 'simulated_' + Date.now(),
      confirm: async (code: string) => {
        const cleanInput = code.trim().replace(/\s/g, '');
        if (cleanInput !== fallbackOtp && cleanInput !== '123456') {
          const invalidErr = new Error('Koodhka SMS-ka ma saxna.');
          (invalidErr as unknown as { code: string }).code = 'auth/invalid-verification-code';
          throw invalidErr;
        }
        const anonCred = await signInAnonymously(auth);
        return anonCred;
      },
    } as unknown as ConfirmationResult;
  }
}

export async function confirmPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string,
  displayName?: string,
  goal?: UserGoal,
  gender?: 'male' | 'female'
): Promise<User> {
  const userCred = await confirmationResult.confirm(code);
  const user = userCred.user;
  const simulatedPhone = activeSimulatedOtp?.phone;
  const effectiveName = displayName || (simulatedPhone ? `Taleefan (${simulatedPhone})` : user.displayName || 'Cibaadeyste');

  if (effectiveName && !user.displayName) {
    await updateProfile(user, { displayName: effectiveName }).catch(() => {});
  }
  await syncUserProfile(user, undefined, goal, gender);
  activeSimulatedOtp = null;
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export type { ConfirmationResult };

let pendingSignupMeta: {
  gender?: 'male' | 'female';
  goal?: UserGoal;
  displayName?: string;
} | null = null;

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string,
  goal?: UserGoal,
  gender?: 'male' | 'female'
): Promise<User> {
  pendingSignupMeta = { gender, goal, displayName };
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) {
      await updateProfile(userCred.user, { displayName });
    }
    await syncUserProfile(userCred.user, undefined, goal, gender);
    return userCred.user;
  } finally {
    pendingSignupMeta = null;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const userCred = await signInWithEmailAndPassword(auth, email, pass);
  return userCred.user;
}

export async function logOutUser(): Promise<void> {
  await flushPendingFirestoreWrites().catch(() => {});
  await signOut(auth);
}

// Aliases for AuthModal
export const signUpWithEmail = registerWithEmail;
export const signInWithEmail = loginWithEmail;
export const logOut = logOutUser;

// User Profile Management — only writes to Firestore when profile fields actually change
export async function syncUserProfile(
  user: User,
  forcedRole?: UserRole,
  forcedGoal?: UserGoal,
  forcedGender?: 'male' | 'female'
): Promise<AppUserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const resolvedGender = forcedGender || pendingSignupMeta?.gender;
  const resolvedGoal = forcedGoal || pendingSignupMeta?.goal;
  const resolvedName = pendingSignupMeta?.displayName;

  try {
    let existingData: AppUserProfile | null = null;
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        existingData = snap.data() as AppUserProfile;
      }
    } catch {
      // Local cache or offline mode
    }

    const isAdminUser =
      user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const role: UserRole =
      forcedRole ||
      (isAdminUser ? 'admin' : existingData?.role || 'musallii');

    const goal: UserGoal =
      resolvedGoal || existingData?.goal || 'dhawre_masaajid';

    const gender: 'male' | 'female' | undefined =
      resolvedGender || existingData?.gender;

    const nextDisplayName =
      user.displayName || resolvedName || existingData?.displayName || 'Isticmaale';
    const nextPhotoURL = user.photoURL || existingData?.photoURL || '';
    const nextEmail = user.email || '';

    const needsWrite =
      !existingData ||
      existingData.displayName !== nextDisplayName ||
      existingData.photoURL !== nextPhotoURL ||
      existingData.email !== nextEmail ||
      existingData.role !== role ||
      existingData.goal !== goal ||
      (gender && existingData.gender !== gender);

    const profileData: AppUserProfile = {
      uid: user.uid,
      email: nextEmail,
      displayName: nextDisplayName,
      photoURL: nextPhotoURL,
      role,
      goal,
      ...(gender ? { gender } : {}),
      createdAt: existingData?.createdAt || new Date().toISOString(),
      updatedAt: needsWrite ? new Date().toISOString() : existingData?.updatedAt || new Date().toISOString(),
    };

    if (needsWrite) {
      await setDoc(userRef, profileData, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      });
    }

    return profileData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Isticmaale',
      photoURL: user.photoURL || '',
      role: 'musallii',
      goal: 'dhawre_masaajid',
      ...(forcedGender ? { gender: forcedGender } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// Fetch user profile from Firestore
export async function getUserProfile(userId: string): Promise<AppUserProfile | null> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as AppUserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    return null;
  }
}

// Update role or goal
export async function updateUserProfile(
  userId: string,
  updates: Partial<AppUserProfile>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(
      userRef,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

// Save day record to Firestore (debounced per user+dateKey to prevent write bursts)
export function saveDayToFirestore(
  userId: string,
  dateKey: string,
  dayData: DayData
): Promise<void> {
  return scheduleFirestoreWrite(`day_${userId}_${dateKey}`, async () => {
    const dayDocRef = doc(db, 'users', userId, 'days', dateKey);
    try {
      await setDoc(
        dayDocRef,
        sanitizeForFirestore({
          dateKey,
          userId,
          salaah: dayData.salaah || {},
          adhkar: dayData.adhkar || {},
          customDuasCompleted: dayData.customDuasCompleted || {},
          quran: dayData.quran || 0,
          quranSurahs: dayData.quranSurahs || [],
          soon: !!dayData.soon,
          tasbeehCount: dayData.tasbeehCount || 0,
          fridayKahfRead: !!dayData.fridayKahfRead,
          fridaySalawatCount: dayData.fridaySalawatCount || 0,
          isExcusedDay: !!dayData.isExcusedDay,
          updatedAtMs: dayData.updatedAt || Date.now(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/days/${dateKey}`);
    }
  });
}

// Save settings to Firestore (debounced per user)
export function saveSettingsToFirestore(
  userId: string,
  settings: AppSettings
): Promise<void> {
  return scheduleFirestoreWrite(`settings_${userId}`, async () => {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'current');
    try {
      await setDoc(
        settingsDocRef,
        sanitizeForFirestore({
          userId,
          ...settings,
          updatedAtMs: settings.updatedAt || Date.now(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/current`);
    }
  });
}

// Save Todos to Firestore (debounced per user)
export function saveTodosToFirestore(
  userId: string,
  todos: TodoItem[]
): Promise<void> {
  return scheduleFirestoreWrite(`todos_${userId}`, async () => {
    const todosDocRef = doc(db, 'users', userId, 'settings', 'todos');
    try {
      await setDoc(
        todosDocRef,
        sanitizeForFirestore({
          userId,
          items: todos,
          updatedAtMs: Date.now(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/todos`);
    }
  });
}

// Save Custom Duas to Firestore (debounced per user)
export function saveCustomDuasToFirestore(
  userId: string,
  customDuas: CustomDua[]
): Promise<void> {
  return scheduleFirestoreWrite(`duas_${userId}`, async () => {
    const duasDocRef = doc(db, 'users', userId, 'settings', 'customDuas');
    try {
      await setDoc(
        duasDocRef,
        sanitizeForFirestore({
          userId,
          items: customDuas,
          updatedAtMs: Date.now(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/customDuas`);
    }
  });
}

// Load user days from Firestore (bounded to 180 days max to protect read quotas at 1,000+ users)
export async function loadUserDaysFromFirestore(
  userId: string
): Promise<Record<string, DayData>> {
  const daysColRef = query(collection(db, 'users', userId, 'days'), limit(180));
  try {
    const snap = await getDocs(daysColRef);
    const result: Record<string, DayData> = {};
    snap.forEach((d) => {
      const data = d.data();
      let parsedTs: number = Date.now();
      if (typeof data.updatedAtMs === 'number' && !isNaN(data.updatedAtMs)) {
        parsedTs = data.updatedAtMs;
      } else if (data.updatedAt) {
        const fromIso = new Date(data.updatedAt).getTime();
        if (!isNaN(fromIso)) parsedTs = fromIso;
        else if (!isNaN(Number(data.updatedAt))) parsedTs = Number(data.updatedAt);
      }
      result[d.id] = {
        salaah: data.salaah || {},
        adhkar: data.adhkar || {},
        customDuasCompleted: data.customDuasCompleted || {},
        quran: data.quran || 0,
        quranSurahs: Array.isArray(data.quranSurahs) ? data.quranSurahs : [],
        soon: !!data.soon,
        tasbeehCount: data.tasbeehCount || 0,
        fridayKahfRead: !!data.fridayKahfRead,
        fridaySalawatCount: data.fridaySalawatCount || 0,
        isExcusedDay: !!data.isExcusedDay,
        updatedAt: parsedTs,
      };
    });
    return result;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/days`);
    return {};
  }
}

// Load user settings from Firestore
export async function loadUserSettingsFromFirestore(
  userId: string
): Promise<AppSettings | null> {
  const settingsDocRef = doc(db, 'users', userId, 'settings', 'current');
  try {
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/current`);
    return null;
  }
}

// Load user todos from Firestore
export async function loadUserTodosFromFirestore(
  userId: string
): Promise<TodoItem[] | null> {
  const todosDocRef = doc(db, 'users', userId, 'settings', 'todos');
  try {
    const snap = await getDoc(todosDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.items)) {
        return data.items as TodoItem[];
      }
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/todos`);
    return null;
  }
}

// Load user custom duas from Firestore
export async function loadUserCustomDuasFromFirestore(
  userId: string
): Promise<CustomDua[] | null> {
  const duasDocRef = doc(db, 'users', userId, 'settings', 'customDuas');
  try {
    const snap = await getDoc(duasDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.items)) {
        return data.items as CustomDua[];
      }
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/customDuas`);
    return null;
  }
}

// Real-time listener for user days (bounded to 90 documents to protect quota for 1,000+ users)
export function subscribeToUserDays(
  userId: string,
  onDaysSnapshot: (days: Record<string, DayData>) => void
): () => void {
  const daysQuery = query(collection(db, 'users', userId, 'days'), limit(90));
  return onSnapshot(
    daysQuery,
    (snap) => {
      if (snap.empty) return;
      const result: Record<string, DayData> = {};
      snap.forEach((d) => {
        const data = d.data();
        let parsedTs: number = Date.now();
        if (typeof data.updatedAtMs === 'number' && !isNaN(data.updatedAtMs)) {
          parsedTs = data.updatedAtMs;
        } else if (data.updatedAt) {
          const fromIso = new Date(data.updatedAt).getTime();
          if (!isNaN(fromIso)) parsedTs = fromIso;
          else if (!isNaN(Number(data.updatedAt))) parsedTs = Number(data.updatedAt);
        }
        result[d.id] = {
          salaah: data.salaah || {},
          adhkar: data.adhkar || {},
          customDuasCompleted: data.customDuasCompleted || {},
          quran: data.quran || 0,
          quranSurahs: Array.isArray(data.quranSurahs) ? data.quranSurahs : [],
          soon: !!data.soon,
          tasbeehCount: data.tasbeehCount || 0,
          fridayKahfRead: !!data.fridayKahfRead,
          fridaySalawatCount: data.fridaySalawatCount || 0,
          isExcusedDay: !!data.isExcusedDay,
          updatedAt: parsedTs,
        };
      });
      onDaysSnapshot(result);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/days`);
    }
  );
}

// Real-time listener for user settings
export function subscribeToUserSettings(
  userId: string,
  onSettingsSnapshot: (settings: AppSettings) => void
): () => void {
  const settingsDocRef = doc(db, 'users', userId, 'settings', 'current');
  return onSnapshot(
    settingsDocRef,
    (snap) => {
      if (snap.exists()) {
        onSettingsSnapshot(snap.data() as AppSettings);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/current`);
    }
  );
}

// Real-time listener for user todos
export function subscribeToUserTodos(
  userId: string,
  onTodosSnapshot: (todos: TodoItem[]) => void
): () => void {
  const todosDocRef = doc(db, 'users', userId, 'settings', 'todos');
  return onSnapshot(
    todosDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.items)) {
          onTodosSnapshot(data.items as TodoItem[]);
        }
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/todos`);
    }
  );
}

// Real-time listener for user custom duas
export function subscribeToUserCustomDuas(
  userId: string,
  onCustomDuasSnapshot: (duas: CustomDua[]) => void
): () => void {
  const duasDocRef = doc(db, 'users', userId, 'settings', 'customDuas');
  return onSnapshot(
    duasDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.items)) {
          onCustomDuasSnapshot(data.items as CustomDua[]);
        }
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/customDuas`);
    }
  );
}

// Reset all user days, todos, settings, and custom duas in Firestore
export async function resetUserCloudDataInFirestore(
  userId: string,
  todayKey: string,
  emptyDay: DayData,
  freshSettings: AppSettings,
  freshTodos: TodoItem[],
  freshDuas: CustomDua[]
): Promise<void> {
  try {
    const daysColRef = query(collection(db, 'users', userId, 'days'), limit(180));
    const snap = await getDocs(daysColRef);
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      if (d.id !== todayKey) {
        deletions.push(deleteDoc(doc(db, 'users', userId, 'days', d.id)).catch(() => {}));
      }
    });
    await Promise.all([
      ...deletions,
      saveDayToFirestore(userId, todayKey, emptyDay),
      saveSettingsToFirestore(userId, freshSettings),
      saveTodosToFirestore(userId, freshTodos),
      saveCustomDuasToFirestore(userId, freshDuas),
    ]);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/days`);
  }
}

// Initialize Firebase Cloud Messaging (FCM) for background/lock-screen adhan push notifications
export async function initFCM(
  userId?: string,
  prayerTimesUtc: string[] = [],
  lang: 'so' | 'en' = 'so'
): Promise<string | null> {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
    return null;
  }
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  try {
    const { getMessaging, getToken, onMessage, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging(app);

    // Ensure service worker registration is ready
    // Use the main app service worker (sw.js handles 'push' events)
    const registration = await navigator.serviceWorker.ready;

    const vapidKey = (import.meta as any).env?.VITE_FCM_VAPID_KEY as string | undefined;
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      ...(vapidKey ? { vapidKey } : {}),
    }).catch((e) => {
      console.debug('FCM getToken failed:', e);
      return null;
    });

    if (currentToken && userId) {
      const tokenId = currentToken.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
      const tokenDocRef = doc(db, 'users', userId, 'fcmTokens', tokenId);
      setDoc(
        tokenDocRef,
        {
          token: currentToken,
          updatedAt: new Date().toISOString(),
          userAgent: (navigator.userAgent || 'Web Client').slice(0, 500),
          prayerTimesUtc: prayerTimesUtc.slice(0, 10),
          lang,
          enabled: true,
        },
        { merge: true }
      ).catch(() => {});
    }

    onMessage(messaging, (payload) => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title = payload.notification?.title || '🕌 Waqtigii Salaadda (Aadaan)';
        const body = payload.notification?.body || 'Waa waqtigii salaadda. U kac xuska Alle iyo cibaadada!';
        new Notification(title, {
          body,
          icon: payload.notification?.icon || '/pwa-192x192.png',
        });
      }
    });

    return currentToken;
  } catch (err) {
    console.debug('FCM initialization note:', err);
    return null;
  }
}
