import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Bell,
  Download,
  Smartphone,
  Globe,
  Clock,
  BookOpen,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMobileInstall?: () => void;
  onOpenNotificationModal?: () => void;
}

interface FAQItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleSo: string;
  titleEn: string;
  descSo: string;
  descEn: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'adhan_screen_off',
    icon: Bell,
    titleSo: 'Sidee aadaanka ugu soo dhacaa shaashadda marka taleefanku xiran yahay?',
    titleEn: 'How does Adhan alert work when my phone screen is locked?',
    descSo:
      'Guji batoonka "Furo Aadaanka" ee dusha sare ama Dejinta, kaddib ogolow Notification-ka iyo codka. Haddii aad isticmaaleyso Android ama Chrome, ku dar app-ka shaashaddaada (Install App), waxaadna ka saartaa battery saver-ka si aadaanka loo diro waqtigiisa.',
    descEn:
      'Tap "Enable Adhan" at the top or in Settings, then allow notification & sound permissions. If on Android, install the app to your home screen and turn off battery optimization for Tuko so background alerts arrive on time.',
  },
  {
    id: 'multi_device_sync',
    icon: Smartphone,
    titleSo: 'Sideen hal koonto ugu isticmaali karaa Phone, Tablet, iyo Laptop?',
    titleEn: 'How do I use one account on my Phone, Tablet, and Laptop?',
    descSo:
      'Guji batoonka "Gal Koontada" ee dusha sare, kaddib gal ciwaankaaga Google (tusaale: ccakiincasan@gmail.com). Markaad isla ciwaankaas ku gasho qalab kasta oo kale, salaadaha aad calaamadiso, streak-ga, iyo Quraanka ilbiriqsi gudihiis ayay isu waafaqayaan (Real-Time Cloud Sync).',
    descEn:
      'Tap "Sign In" at the top and log in with your Google account. When you log in with the same email on your other devices, all prayer logs, streaks, and Quran progress sync in real time across them.',
  },
  {
    id: 'install_app',
    icon: Download,
    titleSo: 'Sideen app-ka ugu rakibaa (Install) taleefankayga?',
    titleEn: 'How do I install Tuko on my phone (iPhone & Android)?',
    descSo:
      'Android/Chrome: Guji batoonka "Install Tuko" ee dusha sare, ama 3-da dhibcood ee browser-ka kaddibna "Install app".\niPhone/Safari: Guji batoonka Share (fallaarta kor u jeedda ee Safari), kaddib dooro "Add to Home Screen (+)". App-ku wuxuu noqonayaa mid toos uga furma shaashaddaada.',
    descEn:
      'Android/Chrome: Tap "Install Tuko" in the header, or browser menu (3 dots) -> "Install app".\niPhone/Safari: Tap the Safari Share button (box with arrow pointing up) -> scroll down and tap "Add to Home Screen (+)".',
  },
  {
    id: 'offline_mode',
    icon: Clock,
    titleSo: 'Ma isticmaali karaa app-ka haddii aan internet jirin (Offline)?',
    titleEn: 'Can I use the app without internet (Offline Mode)?',
    descSo:
      'Haa! Tuko waa PWA si buuxda offline ugu shaqeeya. Waqtiyada salaadda, diiwaangelinta, tasbeexda, iyo adhkaarta waxay ku shaqeynayaan internet la\'aan. Markaad dib ugu xiranto internet-ka, xogtaada waxay toos ugu kaydsameysaa Cloud-ka.',
    descEn:
      'Yes! Tuko is a fully offline-capable PWA. Prayer times, trackers, tasbeeh, and adhkaar work without internet. When you reconnect, all your data automatically syncs to the cloud.',
  },
  {
    id: 'quran_tafsir',
    icon: BookOpen,
    titleSo: 'Sideen u dhageystaa Quraanka codadka badan iyo Tafsiirka Soomaaliga?',
    titleEn: 'How do I listen to multi-reciter Quran and Somali Tafsir?',
    descSo:
      'Fur qaybta "Qur\'aan", dooro suuradda aad rabto. Waxaad ka dhex dooran kartaa codadka Mishary, Cabdulbaasid, Maher Al-Muaiqly, Minshawi, iyo As-Sudais. Dusha sare iyo aayad kasta hoosteeda waxaa ku yaal batoonka "Dhageyso Tafsiirka" oo leh darsigii codka ahaa ee Sheekh Cumar Faaruuq (AUN) ama Sheekh Maxamed Cabdi Umal.',
    descEn:
      'Open the "Qur\'an" tab, choose any surah. Choose from top reciters like Mishary, Abdulbasit, Maher Al-Muaiqly, Minshawi, or Sudais. You can also listen to audio Somali Tafsir by Sheikh Cumar Faaruuq (AUN) or Sheikh Umal directly above each surah or beneath any ayah.',
  },
  {
    id: 'change_language',
    icon: Globe,
    titleSo: 'Sideen luqadda ugu beddelaa Af-Soomaali ama English?',
    titleEn: 'How do I switch the language between Somali and English?',
    descSo:
      'Dusha sare ee app-ka waxaa ku yaal badhanka "🇸🇴 SO | 🇬🇧 EN". Guji hal mar si aad luqadda ugu beddesho Af-Soomaali ama English. Qoraalka Carabiga ah ee Qur\'aanka iyo Ducooyinka weligood isma beddelayaan.',
    descEn:
      'In the top header, click the "🇸🇴 SO | 🇬🇧 EN" pill to instantly toggle between Somali and English. Arabic Quran and Duas remain intact in authentic Arabic.',
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  onOpenMobileInstall,
  onOpenNotificationModal,
}) => {
  const [openFaqId, setOpenFaqId] = useState<string | null>('adhan_screen_off');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { language } = useLanguage();

  if (!isOpen) return null;

  const filteredFaqs = FAQS.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.titleSo.toLowerCase().includes(q) ||
      f.titleEn.toLowerCase().includes(q) ||
      f.descSo.toLowerCase().includes(q) ||
      f.descEn.toLowerCase().includes(q)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-gradient-to-br from-slate-900 via-[#071d24] to-slate-950 border border-teal-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-teal-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-300 border border-teal-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="help-modal-title" className="text-base sm:text-lg font-black text-white">
                {language === 'en' ? 'Help & How-To Guide' : 'Caawimaad & Sida Loo Isticmaalo'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'en'
                  ? 'Common questions, setup guides & tips'
                  : 'Su\'aalaha badanaa la isweydiiyo & tilmaamo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Xir daaqadda"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-2 my-4">
          {onOpenNotificationModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNotificationModal();
              }}
              className="p-3 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-200 flex items-center gap-2 text-xs font-bold transition text-left"
            >
              <Bell className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{language === 'en' ? 'Setup Adhan Alerts' : 'Shid Aadaanka'}</span>
            </button>
          )}

          {onOpenMobileInstall && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMobileInstall();
              }}
              className="p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 flex items-center gap-2 text-xs font-bold transition text-left"
            >
              <Download className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{language === 'en' ? 'Install to Phone' : 'Ku shubo Taleefanka'}</span>
            </button>
          )}
        </div>

        {/* FAQ Accordion List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredFaqs.map((faq) => {
            const Icon = faq.icon;
            const isOpen = openFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-slate-100">
                      {language === 'en' ? faq.titleEn : faq.titleSo}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-teal-300' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 bg-slate-950/40 animate-in fade-in duration-150">
                    {language === 'en' ? faq.descEn : faq.descSo}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-teal-500/20 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 text-teal-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Tuko App • Dhawr-Salaad & Adkaar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs cursor-pointer"
          >
            {language === 'en' ? 'Close' : 'Waayahay'}
          </button>
        </div>
      </div>
    </div>
  );
};
