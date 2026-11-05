import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, ADMIN_EMAIL } from './firebase';
import {
  AppUserProfile,
  UserRole,
  AppAnnouncement,
  AdminAppConfig,
  AdminUserStats,
} from '../types';

/**
 * Check if the given user has administrator privileges
 */
export function isUserAdmin(
  userEmail?: string | null,
  role?: string | null
): boolean {
  if (userEmail && userEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  return role === 'admin';
}

/**
 * Fetch all registered users from Firestore /users collection
 */
export async function fetchAllUsers(): Promise<AppUserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    const users: AppUserProfile[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AppUserProfile;
      users.push({
        ...data,
        uid: data.uid || docSnap.id,
      });
    });

    // Sort by latest updated or created first
    users.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return users;
  } catch (err) {
    console.error('Failed to fetch users from Firestore:', err);
    throw err;
  }
}

/**
 * Compute aggregate statistics for the admin dashboard
 */
export function computeUserStats(users: AppUserProfile[]): AdminUserStats {
  let maleUsers = 0;
  let femaleUsers = 0;
  let adminsCount = 0;

  users.forEach((u) => {
    if (u.gender === 'female') {
      femaleUsers++;
    } else if (u.gender === 'male') {
      maleUsers++;
    }
    if (u.role === 'admin' || (u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
      adminsCount++;
    }
  });

  return {
    totalUsers: users.length,
    maleUsers,
    femaleUsers,
    adminsCount,
  };
}

/**
 * Promote or change a user's role in Firestore
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      role: newRole,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Fetch all announcements (active and archived)
 */
export async function fetchAnnouncements(): Promise<AppAnnouncement[]> {
  try {
    const announcementsCol = collection(db, 'announcements');
    const snapshot = await getDocs(announcementsCol);
    const list: AppAnnouncement[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AppAnnouncement;
      list.push({
        ...data,
        id: data.id || docSnap.id,
      });
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.error('Failed to fetch announcements:', err);
    return [];
  }
}

/**
 * Save or update an announcement banner
 */
export async function saveAnnouncement(
  announcement: AppAnnouncement
): Promise<void> {
  const id = announcement.id || `ann_${Date.now()}`;
  const ref = doc(db, 'announcements', id);
  await setDoc(
    ref,
    {
      ...announcement,
      id,
      createdAt: announcement.createdAt || new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Delete an announcement banner
 */
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const ref = doc(db, 'announcements', announcementId);
  await deleteDoc(ref);
}

/**
 * Real-time listener for active announcements for broadcast banners
 */
export function listenToActiveAnnouncements(
  callback: (announcements: AppAnnouncement[]) => void
): () => void {
  const colRef = collection(db, 'announcements');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AppAnnouncement[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AppAnnouncement;
        if (data.active) {
          list.push({ ...data, id: data.id || docSnap.id });
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Silent notice: announcements listener snapshot error:', err);
    }
  );
}

/**
 * Fetch general app config / feature flags
 */
export async function fetchAppConfig(): Promise<AdminAppConfig | null> {
  try {
    const ref = doc(db, 'app_config', 'general');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as AdminAppConfig;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch app config:', err);
    return null;
  }
}

/**
 * Save general app config / feature flags
 */
export async function saveAppConfig(
  config: AdminAppConfig,
  adminEmail: string
): Promise<void> {
  const ref = doc(db, 'app_config', 'general');
  await setDoc(
    ref,
    {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    },
    { merge: true }
  );
}
