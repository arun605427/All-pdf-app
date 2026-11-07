import React from 'react';
import { Smartphone, Download, CheckCircle2, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useHaptic } from '../hooks/useHaptic';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, isAndroid, install } = usePWAInstall();
  const { triggerHaptic, successHaptic } = useHaptic();

  if (!isOpen) return null;

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Install App</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Works 100% Offline on Android 9+ & iOS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits list */}
        <div className="space-y-2 mb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Opens instantly like a native Android APK app</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Process documents with zero internet required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Full screen mode without browser URL bars</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Optimized memory & CPU usage for Android 9+</span>
          </div>
        </div>

        {/* Instructions based on platform */}
        {isInstallable ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 active:scale-98 transition"
            >
              <Download className="w-4 h-4" />
              <span>Install to Home Screen Now</span>
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
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-200">How to install on Android Chrome:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>Tap the three dots (⋮) menu in top right of Chrome.</li>
              <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
              <li>Confirm and find PDFMaster on your phone&apos;s home screen!</li>
            </ol>
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
