import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Bell,
  Volume2,
  UserCheck,
  Check,
  ArrowRight,
  Globe,
  Compass,
} from 'lucide-react';
import { SOMALIA_CITIES } from '../utils/somaliaCities';
import { requestNotificationPermission, audioAlerts } from '../utils/audioAlerts';
import { useLanguage, AppLanguage } from '../utils/i18n';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: (selectedCityId: string, selectedGender: 'male' | 'female') => void;
  onOpenAuth: () => void;
  currentCityId: string;
  currentGender?: 'male' | 'female';
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onComplete,
  onOpenAuth,
  currentCityId,
  currentGender = 'male',
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCity, setSelectedCity] = useState<string>(currentCityId || 'mogadishu');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>(currentGender || 'male');
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const { language, setLanguage } = useLanguage();

  if (!isOpen) return null;

  const handleCitySelect = (cityId: string) => {
    setSelectedCity(cityId);
  };

  const handleEnableAudioAndNotif = async () => {
    audioAlerts.unlockAudio();
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    setStep(3);
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('tuko_onboarding_completed', 'true');
    } catch {}
    onComplete(selectedCity, selectedGender);
  };

  const handleFinishWithAuth = () => {
    handleFinish();
    onOpenAuth();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 via-[#06181f] to-slate-950 border border-teal-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Progress indicators */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-teal-400'
                    : s < step
                    ? 'w-4 bg-teal-500/60'
                    : 'w-4 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono font-bold text-teal-400">
            {step} / 3
          </span>
        </div>

        {/* STEP 1: Luqadda & Magaalada (Language & City) */}
        {step === 1 && (
          <div className="space-y-5 overflow-y-auto pr-1">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ku soo dhowow Tuko • Welcome to Tuko</span>
              </div>
              <h2 id="onboarding-title" className="text-xl sm:text-2xl font-black text-white">
                {language === 'en' ? 'Language, Gender & City' : 'Dooro Luqadda, Qaybtaada & Magaalada'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {language === 'en'
                  ? 'Select your preferred language, gender (brother/sister), and location for accurate prayer times.'
                  : 'Dooro luqadda, qaybtaada (Wiil ama Gabar) iyo magaaladaada si aad u hesho xogta iyo waqtiyada saxda ah.'}
              </p>
            </div>

            {/* Language Selection */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{language === 'en' ? 'Language' : 'Luqadda'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('so')}
                  className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
                    language === 'so'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span>🇸🇴 Af-Soomaali</span>
                  {language === 'so' && <Check className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
                    language === 'en'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span>🇬🇧 English</span>
                  {language === 'en' && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Gender Selection (Wiil ama Gabar) */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {language === 'en' ? 'Gender (Brother or Sister)' : 'Ma Wiil baad tahay mise Gabar?'}
                  </span>
                </label>
                <span className="text-[11px] font-bold text-teal-300">
                  {selectedGender === 'female'
                    ? (language === 'en' ? '🌸 Girl (Sister)' : '🌸 Gabar')
                    : (language === 'en' ? '🕌 Boy (Brother)' : '🕌 Wiil')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedGender('male')}
                  className={`py-2.5 px-3 rounded-xl border text-left transition active:scale-95 cursor-pointer flex items-center gap-2.5 ${
                    selectedGender === 'male'
                      ? 'bg-emerald-950/70 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-md'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-base shrink-0">
                    🕌
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {language === 'en' ? 'Boy (Brother)' : 'Wiil (Walaal)'}
                      </span>
                      {selectedGender === 'male' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-emerald-300/80 block truncate">
                      {language === 'en' ? 'Mosque prayer' : 'Masaajidka'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGender('female')}
                  className={`py-2.5 px-3 rounded-xl border text-left transition active:scale-95 cursor-pointer flex items-center gap-2.5 ${
                    selectedGender === 'female'
                      ? 'bg-pink-950/70 border-pink-400 text-white ring-2 ring-pink-400/40 shadow-md'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center text-base shrink-0">
                    🌸
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {language === 'en' ? 'Girl (Sister)' : 'Gabar (Walaashay)'}
                      </span>
                      {selectedGender === 'female' && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-pink-300/80 block truncate">
                      {language === 'en' ? 'Home & Excused' : 'Guriga & Fasaxa'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* City Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span>{language === 'en' ? 'City / Location' : 'Magaaladaada'}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {SOMALIA_CITIES.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCitySelect(city.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
                      selectedCity === city.id
                        ? 'bg-teal-500/20 border-teal-400 text-teal-200 font-bold shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="truncate font-semibold">{city.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{city.region}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer mt-4"
            >
              <span>{language === 'en' ? 'Continue' : 'Sii wad'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Aadaanka & Wargelinta (Adhan & Notification) */}
        {step === 2 && (
          <div className="space-y-5 overflow-y-auto pr-1">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Aadaan & Alaarm • Adhan & Audio</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {language === 'en' ? 'Adhan Audio & Alerts' : 'Codka Aadaanka & Ogeysiisyada'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {language === 'en'
                  ? 'Enable notifications and audio so you never miss a prayer on time.'
                  : 'Ogolow ogeysiisyada iyo codka si aadaanka salaaddu ugu soo dhaco taleefankaaga marka la gaaro.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/70 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-300 shrink-0 mt-0.5">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white">
                    {language === 'en' ? 'Push Notifications' : 'Wargelinta Shaashadda'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                    {language === 'en'
                      ? 'Adhan alerts display on your lock screen when prayer arrives.'
                      : 'Wargelintu waxay ku soo dhacaysaa shaashadda xitaa haddii app-ku xiran yahay.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/70 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300 shrink-0 mt-0.5">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white">
                    {language === 'en' ? 'Authentic Adhan Sounds' : 'Codadka Aadaanka ee Culimada'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                    {language === 'en'
                      ? 'Choose from 8 authentic muadhins for each of the 5 daily prayers.'
                      : 'Waxaad dooran kartaa 8 cod oo caan ah oo aadaanka u gaar ah.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleEnableAudioAndNotif}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>
                  {language === 'en' ? 'Enable Adhan & Alerts' : 'Ogolow Aadaanka & Ogeysiisyada'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {language === 'en' ? 'Skip for now' : 'Hada ka gudub (Mar dambe)'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Koontada & Isku-Xirka (Account & Cloud Sync) */}
        {step === 3 && (
          <div className="space-y-5 overflow-y-auto pr-1">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Koontada • Multi-Device Sync</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {language === 'en' ? 'Account & Backup' : 'Koontada & Isku-Xirka Qalabka'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {language === 'en'
                  ? 'Sign in to sync your prayers, streaks, and Quran progress across all your devices.'
                  : 'Gal koontadaada si aad xogta salaadahaaga, streak-ga, iyo Quraanka isugu xirto Mobile, Tablet, iyo Laptop.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  {language === 'en'
                    ? 'Free to use with or without an account'
                    : 'App-ka waa bilaash oo waa la isticmaali karaa koonto la\'aan'}
                </span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {language === 'en'
                  ? 'Signing in with Google is optional, but recommended to keep your streaks safe even if you switch phones.'
                  : 'Galka Google waa ikhtiyaari, laakiin waxaa lagugula talinayaa si aan streak-gaagu u lumin haddii aad taleefanka beddesho.'}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleFinishWithAuth}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <span>
                  {language === 'en'
                    ? 'Sign In with Google / Email'
                    : 'Gal Koontada Google / Email'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95 cursor-pointer text-center"
              >
                {language === 'en'
                  ? 'Start Using as Guest (Local Only)'
                  : 'Ku bilow Guest (App-ka toos u fur)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
