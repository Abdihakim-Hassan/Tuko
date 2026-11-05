import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Megaphone,
  Sliders,
  Bell,
  Sparkles,
  Check,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  ArrowLeft,
  Crown,
  Moon,
  Volume2,
  Flame,
  AlertCircle,
  Info,
  Lock,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AppUserProfile,
  UserRole,
  AppAnnouncement,
  AdminAppConfig,
  AdminUserStats,
} from '../types';
import {
  isUserAdmin,
  fetchAllUsers,
  computeUserStats,
  updateUserRole,
  fetchAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  fetchAppConfig,
  saveAppConfig,
} from '../utils/adminService';
import { ADMIN_EMAIL } from '../utils/firebase';

interface AdminDashboardViewProps {
  currentUser: User | null;
  userProfile?: AppUserProfile | null;
  onClose: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  userProfile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'announcements' | 'config' | 'system'>('users');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<AppUserProfile[]>([]);
  const [stats, setStats] = useState<AdminUserStats>({
    totalUsers: 0,
    maleUsers: 0,
    femaleUsers: 0,
    adminsCount: 0,
  });
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Announcements State
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [showNewAnnModal, setShowNewAnnModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<AppAnnouncement['type']>('info');
  const [newTarget, setNewTarget] = useState<'all' | 'male' | 'female'>('all');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // App Config & CMS State
  const [appConfig, setAppConfig] = useState<AdminAppConfig>({
    maintenanceMode: false,
    featureFlags: {
      somaliAudioTafsir: true,
      fcmPushNotifications: true,
      communityStreaks: true,
      ramadanSpecialSection: false,
    },
    dailyQuote: {
      arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا',
      somali: 'Hubaal, salaaddu waxay ku tahay mu’miniinta waajib waqtiyeysan.',
      source: 'Suurat An-Nisaa (103)',
    },
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  const isAdmin = isUserAdmin(currentUser?.email, userProfile?.role);

  // Auto-clear toast
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const [fetchedUsers, fetchedAnnouncements, fetchedConfig] = await Promise.all([
        fetchAllUsers().catch((err) => {
          console.warn('Could not fetch users list:', err);
          return [] as AppUserProfile[];
        }),
        fetchAnnouncements().catch((err) => {
          console.warn('Could not fetch announcements:', err);
          return [] as AppAnnouncement[];
        }),
        fetchAppConfig().catch((err) => {
          console.warn('Could not fetch config:', err);
          return null;
        }),
      ]);

      setUsersList(fetchedUsers);
      setStats(computeUserStats(fetchedUsers));
      setAnnouncements(fetchedAnnouncements);
      if (fetchedConfig) {
        setAppConfig((prev) => ({
          ...prev,
          ...fetchedConfig,
          featureFlags: {
            ...prev.featureFlags,
            ...fetchedConfig.featureFlags,
          },
          dailyQuote: {
            arabic: fetchedConfig.dailyQuote?.arabic ?? prev.dailyQuote?.arabic ?? '',
            somali: fetchedConfig.dailyQuote?.somali ?? prev.dailyQuote?.somali ?? '',
            source: fetchedConfig.dailyQuote?.source ?? prev.dailyQuote?.source ?? '',
          },
        }));
      }
    } catch (err: any) {
      setErrorMsg('Khalad ayaa dhacay xogta soo qaadashadeeda: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser?.email]);

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
      );
      setStats((prev) =>
        computeUserStats(
          usersList.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
        )
      );
      showToast(`Darajada qofka waxaa loo beddelay: ${newRole}`);
    } catch (err: any) {
      alert('Khalad beddelka darajada: ' + (err.message || ''));
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Save Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Fadlan geli ciwaanka iyo faahfaahinta wargelinta');
      return;
    }
    setSavingAnnouncement(true);
    try {
      const item: AppAnnouncement = {
        id: `ann_${Date.now()}`,
        title: newTitle.trim(),
        content: newContent.trim(),
        type: newType,
        targetAudience: newTarget,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await saveAnnouncement(item);
      setAnnouncements((prev) => [item, ...prev]);
      setShowNewAnnModal(false);
      setNewTitle('');
      setNewContent('');
      showToast('Wargelinta si guul leh ayaa loo baahiyey!');
    } catch (err: any) {
      alert('Khalad dirista wargelinta: ' + (err.message || ''));
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Toggle Announcement Active State
  const handleToggleAnnouncementActive = async (ann: AppAnnouncement) => {
    const updated = { ...ann, active: !ann.active };
    try {
      await saveAnnouncement(updated);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? updated : a))
      );
      showToast(updated.active ? 'Wargelinta waa la shiday' : 'Wargelinta waa la demiyey');
    } catch (err: any) {
      alert('Khalad: ' + err.message);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Ma hubtaa inaad tirtirto wargelintan?')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Wargelinta waa la tirtiray');
    } catch (err: any) {
      alert('Khalad: ' + err.message);
    }
  };

  // Save App Config
  const handleSaveAppConfig = async () => {
    setSavingConfig(true);
    try {
      await saveAppConfig(appConfig, currentUser?.email || ADMIN_EMAIL);
      showToast('Qaabeynta app-ka si guul leh ayaa loo keydiyey!');
    } catch (err: any) {
      alert('Khalad keydinta qaabeynta: ' + (err.message || ''));
    } finally {
      setSavingConfig(false);
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesQuery =
      (u.displayName || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.uid || '').toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesGender =
      genderFilter === 'all' ||
      (genderFilter === 'male' && u.gender === 'male') ||
      (genderFilter === 'female' && u.gender === 'female');
    return matchesQuery && matchesGender;
  });

  // Guard: Unauthorized View
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Qaybta Maamulka Kaliya (Admin Only)</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Qaybtan waxaa loogu talagalay maamulka sare ee app-ka Tuko (<span className="text-amber-400 font-mono text-xs">{ADMIN_EMAIL}</span>).
            Fadlan ku gal koontada maamulka si aad u furto dashboard-ka.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition"
            >
              Dib ugu Noqo App-ka
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Dib ugu noqo App-ka"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950 font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">Tuko Admin Dashboard</h1>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full">
                  Live Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Maamulka Isticmaalayaasha & Astaamaha App-ka • <span className="text-amber-400 font-mono">{currentUser?.email}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Cusbooneysii Xogta"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition"
            title="Xir Dashboard-ka"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="bg-emerald-600/90 border-b border-emerald-500 px-4 py-2.5 text-center text-xs sm:text-sm font-medium text-white flex items-center justify-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 flex gap-1 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Isticmaalayaasha ({stats.totalUsers})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Wargelinta Guud ({announcements.filter((a) => a.active).length} shidan)</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Astaamaha App-ka & CMS</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'system'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Amniga & Xogta Cloud</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
        {/* TAB 1: USERS & ANALYTICS */}
        {activeTab === 'users' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalUsers}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Guud Ahaan Dadka Diiwaangashan</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-300">{stats.maleUsers}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Wiilal (Rag)</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-300">{stats.femaleUsers}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Gabdho (Dumar)</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300">{stats.adminsCount}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Maamulayaal (Admins)</div>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Raadi magaca, emailka ama UID..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
                  <button
                    onClick={() => setGenderFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition font-medium ${
                      genderFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dhammaan
                  </button>
                  <button
                    onClick={() => setGenderFilter('male')}
                    className={`px-3 py-1.5 rounded-lg transition font-medium ${
                      genderFilter === 'male'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Wiilal
                  </button>
                  <button
                    onClick={() => setGenderFilter('female')}
                    className={`px-3 py-1.5 rounded-lg transition font-medium ${
                      genderFilter === 'female'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gabdho
                  </button>
                </div>
              </div>
            </div>

            {/* Users List Cards */}
            {loading ? (
              <div className="text-center py-16 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-medium">Soo qaadaya liiska dadka isticmaala app-ka...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Lama helin isticmaale ku habboon baaritaankaaga.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUsers.map((user) => {
                  const isCurrentAdmin =
                    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.role === 'admin';
                  return (
                    <div
                      key={user.uid}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold shadow-sm ${
                              user.gender === 'female'
                                ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white'
                                : user.gender === 'male'
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                : 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-200'
                            }`}
                          >
                            {user.displayName
                              ? user.displayName.charAt(0).toUpperCase()
                              : user.email
                              ? user.email.charAt(0).toUpperCase()
                              : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-white truncate max-w-[180px]">
                                {user.displayName || 'Isticmaale'}
                              </h3>
                              {user.gender === 'female' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Gabardhac
                                </span>
                              )}
                              {user.gender === 'male' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  Wiil
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono truncate max-w-[220px]">
                              {user.email || user.uid}
                            </p>
                          </div>
                        </div>

                        {/* Current Role Badge */}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                            isCurrentAdmin
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : user.role === 'mentor'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isCurrentAdmin && <Crown className="w-3 h-3 text-amber-400" />}
                          {user.role === 'admin' ? 'Admin' : user.role === 'mentor' ? 'Ustaad' : 'Musallii'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <div>
                          <span>Hadafka: </span>
                          <span className="text-slate-200 font-medium">
                            {user.goal === 'dhawre_masaajid'
                              ? 'Masaajidka'
                              : user.goal === 'xafide_quran'
                              ? "Qur'aanka"
                              : user.goal === 'soome_sunno'
                              ? 'Soonka Sunnada'
                              : user.goal || 'Dhawre'}
                          </span>
                        </div>

                        {/* Role changer dropdown */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-400">Darajo:</label>
                          <select
                            value={user.role || 'musallii'}
                            disabled={updatingUserId === user.uid || user.email === ADMIN_EMAIL}
                            onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                          >
                            <option value="musallii">Musallii</option>
                            <option value="mentor">Ustaad / Mentor</option>
                            <option value="admin">Admin (Maamule)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS & BANNERS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-emerald-400" />
                  Wargelinta Guud (Broadcast Banners)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fariimaha iyo ogeysiisyada tooska ah ee ka muuqanaya bogga hore ee app-ka dhammaan dadka isticmaala.
                </p>
              </div>
              <button
                onClick={() => setShowNewAnnModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Wargelin Cusub</span>
              </button>
            </div>

            {/* List of Announcements */}
            {announcements.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400" />
                <p className="text-sm font-medium">Hadda ma jirto wax wargelin ah oo firfircoon.</p>
                <p className="text-xs text-slate-500 mt-1">Guji "Wargelin Cusub" si aad u dirto fariintaada koowaad.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => {
                  const typeColors = {
                    info: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
                    jumco: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
                    ramadan: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
                    alert: 'border-red-500/40 bg-red-500/5 text-red-400',
                    update: 'border-purple-500/40 bg-purple-500/5 text-purple-400',
                  };
                  return (
                    <div
                      key={ann.id}
                      className={`bg-slate-900 border rounded-2xl p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        ann.active ? 'border-slate-700 shadow-sm' : 'border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              typeColors[ann.type] || typeColors.info
                            }`}
                          >
                            {ann.type}
                          </span>
                          <h3 className="font-bold text-sm text-white">{ann.title}</h3>
                          {ann.targetAudience && ann.targetAudience !== 'all' && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                              Keliya: {ann.targetAudience === 'male' ? 'Wiilasha' : 'Gabdhaha'}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              ann.active
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {ann.active ? 'Firfircoon (Live)' : 'Demisan (Paused)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Taariikhda: {new Date(ann.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <button
                          onClick={() => handleToggleAnnouncementActive(ann)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            ann.active
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {ann.active ? 'Dami' : 'Shid'}
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                          title="Tirtir Wargelinta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APP CONFIG & CMS */}
        {activeTab === 'config' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Astaamaha & Waxyaabaha Ka Mid Ah App-ka (Feature Flags & CMS)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kala beddel astaamaha tooska ah ee shaqeynaya adoon app-ka mar dambe soo gelinayn.
              </p>
            </div>

            {/* Feature Flags Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Astaamaha Shidan (Feature Toggles)
              </h3>

              {/* Somali Audio Tafsir */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Tafsiirka & Codadka Af-Soomaaliga</h4>
                    <p className="text-xs text-slate-400">Qur’aanka iyo ducooyinka ku jira codka Soomaaliga.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!appConfig.featureFlags?.somaliAudioTafsir}
                  onChange={(e) =>
                    setAppConfig((prev) => ({
                      ...prev,
                      featureFlags: {
                        ...prev.featureFlags,
                        somaliAudioTafsir: e.target.checked,
                      },
                    }))
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Ogeysiisyada Aadaanka (Cloud FCM)</h4>
                    <p className="text-xs text-slate-400">U dir ogeysiisyada xilliyada salaadda telefoonada.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!appConfig.featureFlags?.fcmPushNotifications}
                  onChange={(e) =>
                    setAppConfig((prev) => ({
                      ...prev,
                      featureFlags: {
                        ...prev.featureFlags,
                        fcmPushNotifications: e.target.checked,
                      },
                    }))
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Ramadan Section */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Habka Gaarka Ah Ee Ramadaanka</h4>
                    <p className="text-xs text-slate-400">Jadwalka afurka, saxuurta, iyo ducooyinka bisha barakeysan.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!appConfig.featureFlags?.ramadanSpecialSection}
                  onChange={(e) =>
                    setAppConfig((prev) => ({
                      ...prev,
                      featureFlags: {
                        ...prev.featureFlags,
                        ramadanSpecialSection: e.target.checked,
                      },
                    }))
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Community Streaks */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Tirada Joogteynta (Community Streaks)</h4>
                    <p className="text-xs text-slate-400">Dhiirrigelinta salaadda iyo maalmaha xiriirka ah.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!appConfig.featureFlags?.communityStreaks}
                  onChange={(e) =>
                    setAppConfig((prev) => ({
                      ...prev,
                      featureFlags: {
                        ...prev.featureFlags,
                        communityStreaks: e.target.checked,
                      },
                    }))
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Daily Quote / CMS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Xikmadda & Xadiiska Maanta (Daily Inspiration CMS)
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Qoraalka Carabiga ah (Aayad ama Xadiis):
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={appConfig.dailyQuote?.arabic || ''}
                    onChange={(e) =>
                      setAppConfig((prev) => ({
                        ...prev,
                        dailyQuote: {
                          ...prev.dailyQuote,
                          arabic: e.target.value,
                          somali: prev.dailyQuote?.somali || '',
                          source: prev.dailyQuote?.source || '',
                        },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-amber-200 font-arabic focus:outline-none focus:border-emerald-500"
                    placeholder="كتب عليكم الصيام..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Macnaha Af-Soomaaliga:
                  </label>
                  <textarea
                    rows={2}
                    value={appConfig.dailyQuote?.somali || ''}
                    onChange={(e) =>
                      setAppConfig((prev) => ({
                        ...prev,
                        dailyQuote: {
                          ...prev.dailyQuote,
                          arabic: prev.dailyQuote?.arabic || '',
                          somali: e.target.value,
                          source: prev.dailyQuote?.source || '',
                        },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="Fasiraadda iyo macnaha xikmadda..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Asalka / Xigashada (Source):
                  </label>
                  <input
                    type="text"
                    value={appConfig.dailyQuote?.source || ''}
                    onChange={(e) =>
                      setAppConfig((prev) => ({
                        ...prev,
                        dailyQuote: {
                          ...prev.dailyQuote,
                          arabic: prev.dailyQuote?.arabic || '',
                          somali: prev.dailyQuote?.somali || '',
                          source: e.target.value,
                        },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Saxiixul Bukhaari / Suurat Al-Baqarah (183)"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveAppConfig}
                disabled={savingConfig}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{savingConfig ? 'Keydinaya...' : 'Keydi Isbeddellada'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM & CLOUD HEALTH */}
        {activeTab === 'system' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Amniga & Xaaladda Cloud (System & Security)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Warbixinta amniga Firestore, mashruuca Firebase, iyo xogta rasmiga ah.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-400">Mashruuca Firebase</div>
                  <div className="text-base font-mono font-bold text-emerald-400 mt-1">tuko-8a4e3</div>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-400">Hosting Web URL</div>
                  <a
                    href="https://tuko-8a4e3.web.app"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono font-bold text-blue-400 hover:underline mt-1 flex items-center gap-1.5"
                  >
                    <span>tuko-8a4e3.web.app</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-400">Admin Email Xaqiijsan</div>
                  <div className="text-xs font-mono font-bold text-amber-300 mt-1">{ADMIN_EMAIL}</div>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-400">Firestore Security Rules</div>
                  <div className="text-xs font-semibold text-emerald-300 mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ammaan ah (isAdminUser protected)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-300 mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Xusuusin Amni</span>
                </div>
                Dhammaan liiska dadka (<code className="font-mono text-amber-400">/users</code>),
                beddelka darajooyinka, iyo wargelinta guud (<code className="font-mono text-amber-400">/announcements</code>)
                waxaa si toos ah u xakameynaya shuruucda Cloud Firestore Rules oo kaliya kuu oggolaanaya adiga
                (<code className="font-mono text-amber-400">{ADMIN_EMAIL}</code>).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW ANNOUNCEMENT */}
      {showNewAnnModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-white space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-400" />
                Dir Wargelin Cusub
              </h3>
              <button
                onClick={() => setShowNewAnnModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Ciwaanka Wargelinta:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hambalyo Jumco Wanaagsan ama Qayb Cusub"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Faahfaahinta / Farriinta:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Qor farriinta aad rabto in dadku ku arkaan bogga hore..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nooca Wargelinta:
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="info">Warbixin (Info)</option>
                    <option value="jumco">Jumco Wanaagsan (Jumcah)</option>
                    <option value="ramadan">Ramadaan Kariim</option>
                    <option value="alert">Degdeg (Alert)</option>
                    <option value="update">Cusbooneysiin (Update)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Cidda Loo Dirayo:
                  </label>
                  <select
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Dhammaan (All)</option>
                    <option value="male">Wiilasha Kaliya</option>
                    <option value="female">Gabdhaha Kaliya</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAnnModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Ka Noqo
                </button>
                <button
                  type="submit"
                  disabled={savingAnnouncement}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingAnnouncement ? 'Diraya...' : 'Baahi Wargelinta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
