import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, Share2, PlusSquare, X, ExternalLink, Package } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useHaptic } from '../hooks/useHaptic';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const { triggerHaptic, successHaptic } = useHaptic();
  const [activeTab, setActiveTab] = useState<'direct' | 'apk'>('direct');

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-4xwohaa75ecrr6u22jemyv-811509140156.asia-southeast1.run.app';
  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(currentAppUrl)}`;

  const handleInstallClick = async () => {
    triggerHaptic(20);
    const success = await install();
    if (success) {
      successHaptic();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Android App & APK Options</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Install directly or generate an APK file</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'direct'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instant Install (WebAPK)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'apk'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Download APK (.apk)</span>
          </button>
        </div>

        {activeTab === 'direct' ? (
          <div>
            {/* Benefits list */}
            <div className="space-y-2 mb-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Installs as an official <strong>WebAPK</strong> in Android App Drawer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Runs 100% offline with zero internet needed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Full screen experience without browser address bar</span>
              </div>
            </div>

            {/* Platform Instructions */}
            {isInstallable ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 active:scale-98 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Install to Android Home Screen Now</span>
                </button>
              </div>
            ) : isIOS ? (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">How to install on iPhone / iPad:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-1.5">
                    <span>1. Tap the</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-medium">
                      <Share2 className="w-3 h-3 text-blue-500" /> Share
                    </span>
                    <span>button in Safari toolbar.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span>2. Scroll down and tap</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-medium">
                      <PlusSquare className="w-3 h-3 text-blue-500" /> Add to Home Screen
                    </span>
                  </li>
                  <li>3. Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2 text-xs">
                <p className="font-bold text-blue-900 dark:text-blue-200">How to install on Android Chrome:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-blue-800 dark:text-blue-300">
                  <li>Apne phone me Chrome me ye page open karein.</li>
                  <li>Top right corner me <strong>तीन डॉट्स (⋮)</strong> par tap karein.</li>
                  <li>Menu me <strong>&quot;Install app&quot;</strong> ya <strong>&quot;Add to Home screen&quot;</strong> par click karein.</li>
                  <li>Android automatic iska <strong>WebAPK</strong> generate karke phone ke app list me install kar dega!</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-500" />
                Standalone .APK File Kaise Download Karein:
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Ye app Progressive Web App (PWA) standard par bana hai. Microsoft ke official free tool <strong>PWABuilder</strong> se aap direct <strong>.apk</strong> ya <strong>.aab (Play Store)</strong> package generate karke download kar sakte hain:
              </p>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all select-all">
                {currentAppUrl}
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 pt-1">
                <li>Niche diye button par click karke PWABuilder open karein.</li>
                <li><strong>&quot;Build My PWA&quot;</strong> button dabayein.</li>
                <li>Android card me <strong>&quot;Package&quot;</strong> choose karein aur direct <strong>.apk</strong> download kar lein!</li>
              </ol>
            </div>

            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 active:scale-98 transition"
            >
              <Download className="w-4 h-4" />
              <span>Generate & Download APK on PWABuilder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
