import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Mail,
  UserPlus,
  Crown,
  HeartHandshake,
  Compass,
  BookOpen,
  Moon,
  KeyRound,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  logOut,
  updateUserProfile,
  resetPassword,
} from '../utils/firebase';
import { AppUserProfile, UserRole, UserGoal } from '../types';
import { TukoLogo } from './TukoLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfile?: AppUserProfile | null;
  onLoginSuccess: (
    user: User,
    profile?: AppUserProfile,
    selectedGender?: 'male' | 'female',
    isNewRegistration?: boolean
  ) => void;
  onLogoutSuccess: () => void;
  onProfileUpdated?: (updatedProfile: AppUserProfile) => void;
  onGenderChange?: (gender: 'male' | 'female') => void;
  currentGender?: 'male' | 'female';
  totalDaysSynced: number;
  isFirstVisitPrompt?: boolean;
  onSkipFirstVisit?: () => void;
}

function formatAuthError(err: unknown): string {
  const errStr = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || '';

  if (code === 'auth/email-already-in-use' || errStr.includes('email-already-in-use')) {
    return 'Email-kan hore ayaa loo isticmaalay. Fadlan dooro "Gal Koontada (Log In)" ama dib u deji furahaaga sirta ah.';
  }
  if (code === 'auth/invalid-email' || errStr.includes('invalid-email')) {
    return 'Email-ka aad gelisay ma ahan mid sax ah. Fadlan dib u hubi qoraalka email-kaaga.';
  }
  if (code === 'auth/weak-password' || errStr.includes('weak-password')) {
    return 'Furaha sirta ah aad buu u liitaa. Fadlan geli ugu yaraan 6 xaraf oo isugu jira xarfo iyo lambarro.';
  }
  if (code === 'auth/user-not-found' || errStr.includes('user-not-found')) {
    return 'Lama helin koonto email-kan leh. Fadlan dooro "Isku Diiwaangeli (Sign Up)".';
  }
  if (code === 'auth/wrong-password' || errStr.includes('wrong-password')) {
    return 'Furaha sirta ah ma saxna. Fadlan dib u hubi ama riix "Ma ilaawday Furaha Sirta ah?".';
  }
  if (code === 'auth/invalid-credential' || errStr.includes('invalid-credential')) {
    return 'Email-ka ama furaha sirta ah ma saxna. Fadlan dib u hubi xogtaada.';
  }
  if (code === 'auth/popup-closed-by-user' || errStr.includes('popup-closed-by-user')) {
    return 'Daaqaddii gelitaanka Google waa la xiray ka hor inta aan la dhammaystirin.';
  }
  if (code === 'auth/popup-blocked' || errStr.includes('popup-blocked')) {
    return 'Biraawsarkaagu wuxuu xannibay daaqadda (Popup). Fadlan oggolow popups-ka oo dib u riix.';
  }
  if (
    code === 'auth/account-exists-with-different-credential' ||
    errStr.includes('account-exists-with-different-credential')
  ) {
    return 'Cinwaankan hore ayaa loogu galay hab kale (sida Google ama Email). Fadlan ku gal habkaas hore.';
  }
  if (code === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
    return 'Isku-dayo badan oo is xigxiga ayaa dhacay. Fadlan dhowr daqiiqo sug ka hor intaadan dib u isku dayin.';
  }
  if (code === 'auth/network-request-failed' || errStr.includes('network-request-failed')) {
    return 'Cillad internet ayaa dhacday. Fadlan hubi khadkaaga internet-ka oo isku day markale.';
  }
  return `Khalad ayaa dhacay: ${errStr.slice(0, 110)}. Fadlan dib u isku day.`;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onLoginSuccess,
  onLogoutSuccess,
  onProfileUpdated,
  onGenderChange,
  currentGender,
  totalDaysSynced,
  isFirstVisitPrompt = false,
  onSkipFirstVisit,
}) => {
  // Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<UserGoal>('dhawre_masaajid');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>(() => currentGender || 'male');

  const modalScrollRef = useRef<HTMLDivElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (errorMessage && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [errorMessage]);

  if (!isOpen) return null;

  // 1. Email Sign Up Handler
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Fadlan geli email-kaaga iyo furahaaga sirta ah.');
      scrollToTop();
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Furaha sirta ah waa inuu ugu yaraan ka koobnaadaa 6 xaraf.');
      scrollToTop();
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const user = await signUpWithEmail(email.trim(), password, fullName.trim(), selectedGoal, selectedGender);
      onLoginSuccess(user, undefined, selectedGender, true);
      const genderLabel = selectedGender === 'female' ? 'Qaybta Gabdhaha 🌸' : 'Qaybta Wiilasha 🕌';
      setSuccessMessage(
        `Si guul leh ayaad u samaysatay koonto cusub (${genderLabel}), ${fullName || 'Cibaadeyste'}!`
      );
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error('Sign Up Error:', err);
      setErrorMessage(formatAuthError(err));
      scrollToTop();
    } finally {
      setLoading(false);
    }
  };

  // 2. Email Login Handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Fadlan geli email-kaaga iyo furahaaga sirta ah.');
      scrollToTop();
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithEmail(email.trim(), password);
      onLoginSuccess(user);
      setSuccessMessage(`Ku soo dhowow, ${user.displayName || 'Cibaadeyste'}! Xogtaadii waa la soo celiyay.`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error('Login Error:', err);
      setErrorMessage(formatAuthError(err));
      scrollToTop();
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Reset Handler (Email-based)
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotPasswordEmail.trim() || email.trim();
    if (!targetEmail) {
      setErrorMessage('Fadlan geli email-ka aad ku diiwaangashan tahay.');
      scrollToTop();
      return;
    }

    setIsSendingReset(true);
    setErrorMessage(null);
    try {
      await resetPassword(targetEmail);
      setResetSentSuccess(true);
      setSuccessMessage(`✅ Link-ga dib-u-dejinta furaha sirta ah waxaa loo diray ${targetEmail}. Fadlan hubi sanduuqaaga (Inbox / Spam).`);
    } catch (err) {
      console.error('Password Reset Error:', err);
      setErrorMessage(formatAuthError(err));
      scrollToTop();
    } finally {
      setIsSendingReset(false);
    }
  };

  // 4. Google 1-Click Login Handler
  const handleGoogleLogin = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');
    setErrorMessage(null);
    try {
      const { user, isNewUser } = await signInWithGoogle(fullName.trim() || undefined, selectedGender, selectedGoal);
      onLoginSuccess(user, undefined, selectedGender, isNewUser);
      const genderLabel = selectedGender === 'female' ? 'Qaybta Gabdhaha 🌸' : 'Qaybta Wiilasha 🕌';
      setSuccessMessage(`Ku soo dhowow, ${user.displayName || 'Isticmaale Google'}! (${genderLabel})`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('popup-closed-by-user') || errStr.includes('cancelled-popup-request')) {
        return;
      }
      console.error('Google Login Error:', err);
      setErrorMessage(formatAuthError(err));
      scrollToTop();
    } finally {
      setLoadingProvider(null);
    }
  };

  // 5. Handle Sign Out
  const handleSignOut = async () => {
    try {
      onClose();
      onLogoutSuccess();
      await logOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
  };

  // 6. Handle Goal Change when logged in
  const handleChangeGoal = async (newGoal: UserGoal) => {
    if (!currentUser) return;
    try {
      await updateUserProfile(currentUser.uid, { goal: newGoal });
      if (userProfile && onProfileUpdated) {
        onProfileUpdated({ ...userProfile, goal: newGoal });
      }
    } catch (err) {
      console.error('Error changing goal:', err);
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Maamulaha Sare (Admin)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
        <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
        <span>Musallii (Cibaadeyste)</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div
        ref={modalScrollRef}
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-[#09222c] via-[#082935] to-[#05171d] border border-teal-500/35 p-5 sm:p-6 text-white shadow-2xl overflow-y-auto max-h-[92vh] scroll-smooth"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
          aria-label="Xir"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <TukoLogo className="w-11 h-11 shrink-0" />
          <div>
            <h3 className="text-lg font-black text-white">
              {isFirstVisitPrompt ? 'Ku soo dhowow Tuko!' : 'Tuko • Koontada & Keydka'}
            </h3>
            <p className="text-xs text-teal-300 font-semibold">
              {isFirstVisitPrompt
                ? 'Diiwaankaaga Salaadda, Adkaarta & Keydka Daruuraha'
                : 'Xafid salaadahaaga, adkaarta, iyo heerkaaga cibaado'}
            </p>
          </div>
        </div>

        {/* First Visit Friendly Banner */}
        {isFirstVisitPrompt && (!currentUser || currentUser.isAnonymous) && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-cyan-500/20 border border-teal-400/40 text-xs text-teal-100 flex items-start gap-2.5 shadow-inner animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="font-extrabold text-white text-xs">
                Asalaamu Calaykum! Ku soo dhowow Tuko.
              </p>
              <p className="text-[11px] text-teal-200/90 leading-relaxed">
                Ku xir <strong>Email ama Google</strong> si 5-taada salaadood, taxanahaaga (streaks 🔥), iyo adkaartaada loogu xafido Cloud-ka qalab kasta (Mobile, Tablet & Laptop)!
              </p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div
            ref={errorBannerRef}
            className="mb-4 p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-100 text-xs sm:text-sm flex items-start gap-2.5 shadow-xl animate-in fade-in slide-in-from-top-2"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* LOGGED IN STATE (Non-anonymous registered account) */}
        {currentUser && !currentUser.isAnonymous ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/20 space-y-3.5">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-emerald-400/50 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-emerald-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-black text-white truncate">
                      {currentUser.displayName || userProfile?.displayName || 'Cibaadeyste'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {currentUser.email || 'Koonto Email'}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {getRoleBadge(userProfile?.role)}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${
                        (currentGender || userProfile?.gender) === 'female'
                          ? 'bg-pink-500/20 border-pink-400/40 text-pink-200'
                          : 'bg-teal-500/20 border-teal-400/40 text-teal-200'
                      }`}
                    >
                      <span>{(currentGender || userProfile?.gender) === 'female' ? '🌸 Gabar' : '🕌 Wiil'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Gender / Section Switcher in Profile */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                  Qaybtaada Salaadda (Wiil / Gabar):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (onGenderChange) onGenderChange('male');
                      if (currentUser) {
                        await updateUserProfile(currentUser.uid, { gender: 'male' });
                        if (userProfile && onProfileUpdated) {
                          onProfileUpdated({ ...userProfile, gender: 'male' });
                        }
                      }
                    }}
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      (currentGender || userProfile?.gender || 'male') === 'male'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🕌</span>
                    <span>Qaybta Wiilasha</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (onGenderChange) onGenderChange('female');
                      if (currentUser) {
                        await updateUserProfile(currentUser.uid, { gender: 'female' });
                        if (userProfile && onProfileUpdated) {
                          onProfileUpdated({ ...userProfile, gender: 'female' });
                        }
                      }
                    }}
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      (currentGender || userProfile?.gender) === 'female'
                        ? 'bg-pink-500/25 border-pink-400 text-pink-200 ring-1 ring-pink-400'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🌸</span>
                    <span>Qaybta Gabdhaha</span>
                  </button>
                </div>
              </div>

              {/* Spiritual Focus / Goal Picker */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                  Hadafkaaga Cibaadada (Spiritual Focus):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleChangeGoal('dhawre_masaajid')}
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                      (userProfile?.goal || 'dhawre_masaajid') === 'dhawre_masaajid'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                    <span>Masaajid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeGoal('xafide_quran')}
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                      userProfile?.goal === 'xafide_quran'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                    <span>Qur'aan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeGoal('soome_sunno')}
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                      userProfile?.goal === 'soome_sunno'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 mx-auto mb-1 text-teal-300" />
                    <span>Soon</span>
                  </button>
                </div>
              </div>

              {/* Cloud Sync Status */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-teal-300">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span>Keydka Cloud-ka:</span>
                </div>
                <span className="font-bold text-white">{totalDaysSynced} maalmood baa xafidan</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Ka Bax Koontada (Log Out)</span>
            </button>
          </div>
        ) : (
          /* NOT LOGGED IN — EMAIL & GOOGLE AUTH */
          <div className="space-y-4">
            {/* VIEW A: FORGOT PASSWORD RECOVERY (EMAIL-BASED) */}
            {isForgotPassword ? (
              <form onSubmit={handlePasswordReset} className="space-y-3.5 p-4 rounded-2xl bg-slate-900/90 border border-teal-500/30">
                <div className="flex items-center gap-2 text-teal-300 mb-1">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Dib u Soo Celinta Furaha Sirta ah ee Email-ka
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Geli cinwaankaaga email-ka hoose. Waxaan kuugu soo diri doonaa link aad dib ugu dejisan kartid furahaaga sirta ah:
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                    Email-kaaga:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={forgotPasswordEmail || email}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="magacaaga@email.com"
                      className="w-full bg-slate-950 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setErrorMessage(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Dib u noqo</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingReset ? 'Dirayaa...' : 'U Dir Link-ga Email-ka'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW B: SIGN IN OR SIGN UP MODES */
              <div className="space-y-4">
                {/* Clean Tab Switcher: [ Gal Koontada (Log In) ] | [ Isku Diiwaangeli (Sign Up) ] */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-teal-500/30">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage(null);
                    }}
                    className={`py-2.5 px-3 text-center rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-300'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Gal Koontada (Log In)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage(null);
                    }}
                    className={`py-2.5 px-3 text-center rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-300'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Isku Diiwaangeli (Sign Up)</span>
                  </button>
                </div>

                {/* 1. LOGIN FORM */}
                {authMode === 'login' && (
                  <form onSubmit={handleEmailLogin} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Email-kaaga: *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="magacaaga@email.com"
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                          Furaha Sirta ah: *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotPasswordEmail(email);
                            setIsForgotPassword(true);
                            setErrorMessage(null);
                          }}
                          className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                        >
                          Ma ilaawday furaha? (Soo cesho)
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Furahaaga sirta ah"
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{loading ? 'Gelaya Koontada...' : 'Gal Koontada (Log In)'}</span>
                    </button>
                  </form>
                )}

                {/* 2. SIGN UP FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleEmailSignUp} className="space-y-3">
                    {/* Gender Choice: Wiil ama Gabar */}
                    <div className="p-3 rounded-2xl bg-slate-900/90 border-2 border-teal-500/40 space-y-2 shadow-inner">
                      <label className="flex items-center justify-between text-[11px] font-black text-amber-300 uppercase tracking-wider">
                        <span>1. Ma Wiil baad tahay mise Gabar? *</span>
                        <span className="text-[10px] text-teal-300 font-bold normal-case">
                          (Xogta Salaadda)
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedGender('male')}
                          className={`p-2.5 rounded-xl text-center text-xs font-black border-2 transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            selectedGender === 'male'
                              ? 'bg-emerald-500/25 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-md'
                              : 'bg-slate-950/70 border-white/10 text-slate-300 hover:border-emerald-500/40 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🕌</span>
                            <span>Wiil (Walaal)</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-300/90">
                            Masaajidka &amp; Jamaacada
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedGender('female')}
                          className={`p-2.5 rounded-xl text-center text-xs font-black border-2 transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            selectedGender === 'female'
                              ? 'bg-pink-500/25 border-pink-400 text-white ring-2 ring-pink-400/40 shadow-md'
                              : 'bg-slate-950/70 border-white/10 text-slate-300 hover:border-pink-500/40 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🌸</span>
                            <span>Gabar (Walaashay)</span>
                          </div>
                          <span className="text-[10px] font-semibold text-pink-300/90">
                            Guriga &amp; Fasaxa (Udhur)
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Magacaaga (Ikhtiyaari):
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="t.e. Axmed Cali / Faadumo"
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Email-kaaga: *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="magacaaga@email.com"
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Furaha Sirta ah (Ugu yaraan 6 xaraf): *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Ugu yaraan 6 xaraf"
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>

                    {/* Spiritual Goal Selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Hadafkaaga Cibaadada:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedGoal('dhawre_masaajid')}
                          className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                            selectedGoal === 'dhawre_masaajid'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                              : 'bg-slate-900/60 border-white/5 text-slate-400'
                          }`}
                        >
                          <Compass className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                          <span className="block text-[11px]">Masaajid</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedGoal('xafide_quran')}
                          className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                            selectedGoal === 'xafide_quran'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                              : 'bg-slate-900/60 border-white/5 text-slate-400'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                          <span className="block text-[11px]">Qur'aan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedGoal('soome_sunno')}
                          className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                            selectedGoal === 'soome_sunno'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                              : 'bg-slate-900/60 border-white/5 text-slate-400'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5 mx-auto mb-1 text-teal-300" />
                          <span className="block text-[11px]">Soon</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{loading ? 'Samaynaya Koontada...' : 'Isku Diiwaangeli (Sign Up)'}</span>
                    </button>
                  </form>
                )}

                {/* 3. OPTIONAL 1-CLICK GOOGLE SIGN IN (FOR INSTANT GMAIL ACCESS) */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <p className="text-[10px] text-center uppercase tracking-wider font-bold text-slate-400">
                    Ama ku gal hal gujis ah:
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading || !!loadingProvider}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white text-slate-900 font-black text-xs sm:text-sm hover:bg-slate-100 transition shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer border border-emerald-400/40"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>
                      {loadingProvider === 'google'
                        ? 'Fureysa Google (Gmail)...'
                        : 'Ku Gal Google (Gmail-kaaga)'}
                    </span>
                  </button>
                </div>

                {/* Skip Option for First-time visitors */}
                {isFirstVisitPrompt && onSkipFirstVisit && (
                  <div className="pt-2 text-center border-t border-white/5">
                    <button
                      type="button"
                      onClick={onSkipFirstVisit}
                      className="text-xs text-slate-400 hover:text-teal-300 font-semibold transition underline underline-offset-4 cursor-pointer"
                    >
                      Hadda bilow oo tijaabi adigoon gelin →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
