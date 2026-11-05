import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Sparkles, ArrowUpCircle, X, Download, AlertTriangle } from 'lucide-react';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  checkForAppUpdate,
  applyAppUpdate,
  AppUpdateCheckResult,
} from '../utils/appUpdateService';

interface AppUpdateSectionProps {
  onOpenMobileInstall?: () => void;
}

export const AppUpdateSection: React.FC<AppUpdateSectionProps> = ({ onOpenMobileInstall }) => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [result, setResult] = useState<AppUpdateCheckResult | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkForAppUpdate();
      setResult(res);
    } catch (e) {
      console.warn('Check update error:', e);
    } finally {
      setIsChecking(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    await applyAppUpdate();
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0c2a23] via-[#091f1a] to-[#04100c] border border-teal-500/35 shadow-xl space-y-3.5">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 text-teal-300">
            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin text-teal-300' : ''}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                Hubi Update-ka (Check for Updates)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[10px] font-mono font-bold">
                v{CURRENT_APP_VERSION} (Build {CURRENT_BUILD_NUMBER})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              Cusboonaysii nooca ugu dambeeyay ee Tuko &amp; App Market
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking || isApplying}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shrink-0 active:scale-95 transition cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Waa la baarayaa...' : 'Hubi Hadda'}</span>
        </button>
      </div>

      {/* Result Card */}
      {result ? (
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-teal-500/25 space-y-2.5 animate-in fade-in">
          {result.isOffline ? (
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Internet ma jiro. Fadlan shid Wi-Fi ama Data si aad update-ka u hubiso.</span>
            </div>
          ) : result.isUpdateAvailable ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-black">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>
                    Update cusub baa diyaar ah: v{result.latestVersion} (Build {result.latestBuild})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Hubiyay: {result.checkedAt}</span>
              </div>

              {result.changelog && result.changelog.length > 0 && (
                <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/20 text-[11px] text-slate-300 space-y-1">
                  <span className="font-bold text-teal-200 block">Waxyaabaha cusub ee lagu soo kordhiyay:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    {result.changelog.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isApplying}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>{isApplying ? 'Waa la cusboonaysiinayaa...' : 'Cusboonaysii Hadda (Apply Update)'}</span>
                </button>

                {onOpenMobileInstall && (
                  <button
                    type="button"
                    onClick={onOpenMobileInstall}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Soo dejiso APK cusub ama ku dar shaashadda"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">APK Cusub</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Waa noocii ugu dambeeyay! App-kaagu wuu casriyeysan yahay (v{CURRENT_APP_VERSION}).</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Hubiyay: {result.checkedAt}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>Qasab ma aha inaad App Market gasho — halkan toos uga cusboonaysii!</span>
          <span className="text-teal-300/80 font-bold">OTA Update ✓</span>
        </div>
      )}
    </div>
  );
};
