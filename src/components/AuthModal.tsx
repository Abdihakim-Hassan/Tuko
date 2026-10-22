import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Mail,
  UserPlus,
  Crown,
  HeartHandshake,
  Check,
  Compass,
  BookOpen,
  Moon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithTwitter,
  signUpWithEmail,
  signInWithEmail,
  logOut,
  updateUserProfile,
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
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign up & Login form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<UserGoal>('dhawre_masaajid');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [awaitingGenderStep, setAwaitingGenderStep] = useState(false);

  const modalScrollRef = useRef<HTMLDivElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // When error message appears, immediately and smoothly scroll user directly to the top error banner
  useEffect(() => {
    if (errorMessage && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      const t1 = setTimeout(() => {
        if (modalScrollRef.current) {
          modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
      const t2 = setTimeout(() => {
        if (modalScrollRef.current) {
          modalScrollRef.current.scrollTop = 0;
        }
      }, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [errorMessage]);

  if (!isOpen) return null;

  const executeEmailSignUp = async (genderChoice: 'male' | 'female') => {
    setLoading(true);
    setErrorMessage(null);
    setAwaitingGenderStep(false);
    try {
      const user = await signUpWithEmail(email, password, fullName, selectedGoal, genderChoice);
      onLoginSuccess(user, undefined, genderChoice, true);
      const genderLabel = genderChoice === 'female' ? 'Qaybta Gabdhaha 🌸' : 'Qaybta Wiilasha 🕌';
      setSuccessMessage(
        `Si guul leh ayaad u samaysatay koonto cusub (${genderLabel}) oo 0 ka bilaabanaysa, ${fullName || 'Cibaadeyste'}!`
      );
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      console.error('Sign Up Error:', errStr);
      if (errStr.includes('email-already-in-use')) {
        setErrorMessage('Email-kan hore ayaa loo isticmaalay. Fadlan koontadaada gal (Login).');
      } else if (errStr.includes('invalid-email')) {
        setErrorMessage('Email-ka aad gelisay ma ahan mid sax ah.');
      } else if (errStr.includes('weak-password')) {
        setErrorMessage('Furaha sirta ah aad buu u liitaa. Geli furaha sirta ah oo xooggan.');
      } else {
        setErrorMessage('Khalad ayaa dhacay xilligii diiwaangelinta. Fadlan hubi xogtaada.');
      }
      scrollToTop();
    } finally {
      setLoading(false);
    }
  };

  // Handle Email & Password Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Fadlan geli email-kaaga iyo furahaaga sirta ah.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Furaha sirta ah waa inuu ugu yaraan ka koobnaadaa 6 xaraf.');
      return;
    }

    // If user hasn't picked Wiil or Gabar yet, ask them explicitly right now before completing registration!
    if (!selectedGender) {
      setErrorMessage(null);
      setAwaitingGenderStep(true);
      scrollToTop();
      return;
    }

    await executeEmailSignUp(selectedGender);
  };

  // Handle Email & Password Login
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
      const user = await signInWithEmail(email, password);
      onLoginSuccess(user);
      setSuccessMessage(`Ku soo dhowow, ${user.displayName || 'Cibaadeyste'}! Xogtaadii waa la soo celiyay.`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      console.error('Login Error:', errStr);
      if (errStr.includes('user-not-found') || errStr.includes('wrong-password') || errStr.includes('invalid-credential')) {
        setErrorMessage('Email-ka ama furaha sirta ah ma saxna. Fadlan dib u hubi.');
      } else {
        setErrorMessage('Khalad ayaa dhacay xilligii gelitaanka. Fadlan dib u isku day.');
      }
      scrollToTop();
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
      setSuccessMessage(`Ku soo dhowow, ${user.displayName || 'Cibaadeyste'}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('cancelled-popup-request')) {
        // Harmless: user clicked again while popup was opening or browser superseded popup
        return;
      }
      if (errStr.includes('popup-closed-by-user')) {
        setErrorMessage('Waxaad xidhay daaqadda gelitaanka Google.');
      } else {
        setErrorMessage('Khalad ayaa dhacay xilligii Google lagu gelayay. Fadlan isku day markale.');
      }
      scrollToTop();
    } finally {
      setLoadingProvider(null);
    }
  };

  // Handle Facebook Login
  const handleFacebookLogin = async () => {
    if (loadingProvider) return;
    setLoadingProvider('facebook');
    setErrorMessage(null);
    try {
      const user = await signInWithFacebook();
      onLoginSuccess(user);
      setSuccessMessage(`Ku soo dhowow, ${user.displayName || 'Cibaadeyste'}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('popup-closed-by-user')) {
        setErrorMessage('Daaqaddii Facebook waa la xidhay.');
      } else {
        // Covers auth/operation-not-allowed and other provider restrictions
        setErrorMessage(
          'Gelitaanka Facebook wuxuu u baahan yahay fasax. Fadlan isticmaal Google ama Email.'
        );
      }
      scrollToTop();
    } finally {
      setLoadingProvider(null);
    }
  };

  // Handle Twitter / X Login
  const handleTwitterLogin = async () => {
    if (loadingProvider) return;
    setLoadingProvider('x');
    setErrorMessage(null);
    try {
      const user = await signInWithTwitter();
      onLoginSuccess(user);
      setSuccessMessage(`Ku soo dhowow X, ${user.displayName || 'Cibaadeyste'}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('popup-closed-by-user')) {
        setErrorMessage('Daaqaddii X / Twitter waa la xidhay.');
      } else {
        // Covers auth/operation-not-allowed and other provider restrictions
        setErrorMessage(
          'Gelitaanka X (Twitter) wuxuu u baahan yahay fasax. Fadlan isticmaal Google ama Email.'
        );
      }
      scrollToTop();
    } finally {
      setLoadingProvider(null);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      onClose();
      onLogoutSuccess();
      await logOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
  };

  // Handle Goal Change when logged in
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
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition"
          aria-label="Xir"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <TukoLogo className="w-11 h-11" />
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
        {isFirstVisitPrompt && !currentUser && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-cyan-500/20 border border-teal-400/40 text-xs text-teal-100 flex items-start gap-2.5 shadow-inner animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="font-extrabold text-white text-xs">
                Asalaamu Calaykum! Ku soo dhowow Tuko.
              </p>
              <p className="text-[11px] text-teal-200/90 leading-relaxed">
                Is-diiwaangeli hal ilbiriqsi si <strong>5-taada salaadood, taxanahaaga (streaks 🔥), iyo adkaartaada</strong> loogu xafido Cloud-ka oo aysan marnaba kaaga lumin!
              </p>
            </div>
          </div>
        )}

        {/* Notification / Alert messages (Top Banner with auto-scroll anchor) */}
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

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGGED IN STATE */}
        {currentUser ? (
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
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
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
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
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
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
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
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
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
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
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
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
                      userProfile?.goal === 'soome_sunno'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 mx-auto mb-1 text-teal-300" />
                    <span>Soon Sunno</span>
                  </button>
                </div>
              </div>

              {/* Sync status */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1 text-teal-300">
                  <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Maalmo la xafiday (Cloud):</span>
                </span>
                <span className="font-mono font-bold text-white bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-500/30">
                  {totalDaysSynced} Maalmood
                </span>
              </div>
            </div>

            {/* Logout button */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-200 font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95 shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Ka Bax Koontada (Log Out)</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 leading-relaxed px-2">
                🔒 Xogtaadu waxay si sugan ugu xafidan tahay Cloud Database-ka. Marka aad ka baxdo, shaashaddu waxay bilaabaysaa eber (fresh start), marka aad mar kale soo gashona dhammaan xogtaadii ayaa laguu soo celinayaa.
              </p>
            </div>
          </div>
        ) : (
          /* NOT LOGGED IN: SIGN UP & LOGIN INTERFACE */
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-950/60 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAwaitingGenderStep(false);
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Is-Diiwaangeli (Sign Up)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAwaitingGenderStep(false);
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Gal Koontada (Log In)</span>
              </button>
            </div>

            {/* EXPLICIT GENDER CONFIRMATION STEP IF USER SUBMITTED SIGNUP WITHOUT PICKING */}
            {authMode === 'signup' && awaitingGenderStep ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0b2e3b] to-[#061c24] border-2 border-teal-400/60 space-y-4 text-center shadow-2xl animate-in fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tallaabada Ugu Dambeysa (Hal Mar Oo Keliya)</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-white">
                    Ma Wiil baad tahay mise Gabar?
                  </h4>
                  <p className="text-xs text-teal-200/90 leading-relaxed">
                    Dooro qaybtaada si loo kala saaro xogta salaadaha{' '}
                    <strong>Wiilasha (Masaajidka)</strong> iyo{' '}
                    <strong>Gabdhaha (Guriga &amp; Maalmaha Fasaxa)</strong>:
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSelectedGender('male');
                      executeEmailSignUp('male');
                    }}
                    className="p-3.5 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 border-2 border-emerald-400 text-white font-black text-xs flex flex-col items-center gap-2 transition active:scale-95 shadow-lg cursor-pointer"
                  >
                    <span className="text-2xl">🕌</span>
                    <span className="text-sm font-black text-emerald-200">Wiil (Walaal)</span>
                    <span className="text-[10px] text-slate-300 font-semibold">
                      Salaadda Masaajidka &amp; Jamaacada
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSelectedGender('female');
                      executeEmailSignUp('female');
                    }}
                    className="p-3.5 rounded-2xl bg-pink-950/70 hover:bg-pink-900/80 border-2 border-pink-400 text-white font-black text-xs flex flex-col items-center gap-2 transition active:scale-95 shadow-lg cursor-pointer"
                  >
                    <span className="text-2xl">🌸</span>
                    <span className="text-sm font-black text-pink-200">Gabar (Walaashay)</span>
                    <span className="text-[10px] text-slate-300 font-semibold">
                      Guriga &amp; Maalmaha Fasaxa (Udhur)
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAwaitingGenderStep(false)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Dib ugu noqo foomka
                </button>
              </div>
            ) : (
              <>
                {/* SIGN UP FORM — GENDER QUESTION RIGHT AT THE VERY TOP! */}
                {authMode === 'signup' && (
                  <form onSubmit={handleEmailSignUp} className="space-y-3">
                    {/* 1. Prominent Gender Selection at Top of Signup */}
                    <div className="p-3 rounded-2xl bg-slate-900/90 border-2 border-teal-500/40 space-y-2 shadow-inner">
                      <label className="flex items-center justify-between text-[11px] font-black text-amber-300 uppercase tracking-wider">
                        <span>1. Ma Wiil baad tahay mise Gabar? *</span>
                        <span className="text-[10px] text-teal-300 font-bold normal-case">
                          (Kala-saaridda Xogta)
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
                            Salaadda Masaajidka
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
                            Guriga &amp; Maalmaha Fasaxa
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Magacaaga oo Buuxa:
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="t.e. Cabdullaahi Cali /aa'isha Cali"
                          className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                        Email-kaaga:
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
                        Furaha Sirta ah (Password):
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

                {/* Role / Goal Choice at Signup */}
                <div>
                  <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                    Dooro Hadafkaaga Cibaadada (Spiritual Focus):
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedGoal('dhawre_masaajid')}
                      className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
                        selectedGoal === 'dhawre_masaajid'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-slate-900/60 border-white/5 text-slate-400'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                      <span className="block text-[11px]">Dhawre Masaajid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedGoal('xafide_quran')}
                      className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
                        selectedGoal === 'xafide_quran'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-slate-900/60 border-white/5 text-slate-400'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                      <span className="block text-[11px]">Qur'aan &amp; Adkaar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedGoal('soome_sunno')}
                      className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
                        selectedGoal === 'soome_sunno'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-slate-900/60 border-white/5 text-slate-400'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 mx-auto mb-1 text-teal-300" />
                      <span className="block text-[11px]">Soon Sunno</span>
                    </button>
                  </div>
                </div>

                {/* Fresh 0-Start & Private Isolation Note */}
                <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/20 text-[11px] text-teal-200 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                  <span>
                    Koontadaadu waxay si toos ah uga bilaabanaysaa <strong>0 (Eber / Fresh Start)</strong>. Xogtaadu waa mid adiga kuu gaar ah oo ku xafidan UID-gaaga u gaarka ah, mana ku qasmayso xogta dadka kale!
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Samaynaya Koontada...' : 'Abuur Koonto Cusub (Sign Up)'}
                </button>
              </form>
            )}

            {/* LOGIN FORM */}
            {authMode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1">
                    Email-kaaga:
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
                    Furaha Sirta ah (Password):
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Furahaaga sirta ah"
                      className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Gelaya Koontada...' : 'Gal Koontada (Log In)'}
                </button>
              </form>
            )}

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#082935] px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
                ama Ku Gal Google
              </span>
            </div>

            {/* Google 1-Click Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || !!loadingProvider}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-black text-xs hover:bg-slate-100 transition shadow-lg active:scale-95 disabled:opacity-50"
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
              <span>{loadingProvider === 'google' ? 'Fureysa Google...' : 'Ku Gal Hal Gujis Google (1-Click)'}</span>
            </button>
              </>
            )}

            {/* Alternative Social Logins: Facebook & X */}
            <div className="pt-2 border-t border-white/5 space-y-2 text-center">
              {/* Bottom error display so users at the bottom immediately see the message without searching */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-100 text-xs flex items-start gap-2 text-left shadow-lg animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-bold flex-1 leading-snug">{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  title="Gal adigoo isticmaalaya Facebook"
                >
                  <span className="text-[#1877F2] font-black">f</span>
                  <span>Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={handleTwitterLogin}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  title="Gal adigoo isticmaalaya Twitter / X"
                >
                  <span className="font-black text-white">𝕏</span>
                  <span>Twitter / X</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                (Google iyo Email ayaa hadda si toos ah u furan 100%)
              </p>
            </div>

            {/* Skip Option for First-time visitors */}
            {isFirstVisitPrompt && onSkipFirstVisit && (
              <div className="pt-3 text-center border-t border-white/5">
                <button
                  type="button"
                  onClick={onSkipFirstVisit}
                  className="text-xs text-slate-400 hover:text-teal-300 font-semibold transition underline underline-offset-4"
                >
                  Hadda bilow oo tijaabi adigoon gelin →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
