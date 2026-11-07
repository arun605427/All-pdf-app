import React from 'react';
import { ShieldCheck, Zap, Lock, Smartphone, HelpCircle, Heart } from 'lucide-react';

export const FooterInfo: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8 pb-12 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Core Value Props Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-1">100% Private</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Files never leave your phone or computer. All rendering is local in-memory.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-1">Android 9+ Optimized</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Smooth 60 FPS hardware acceleration, chunked memory buffers, and fast touch responsiveness.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-1">Install as App (PWA)</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add directly to your Android Home Screen and use full offline suite without internet.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-1">No Limits or Watermarks</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Free, unrestricted, no registration, no file size gates, no spam watermarks.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Tips & FAQ Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            Quick Tips & Guidelines
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">🗜️ Best Compression results:</p>
              <p className="text-slate-500 leading-relaxed">
                Choose <strong>Balanced</strong> for regular university, office, or email submissions. When applying for government exams or official portals with strict size limits (e.g. max 200 KB), use <strong>Exact Target Size</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">📐 Printing Multiple Pages (N-up):</p>
              <p className="text-slate-500 leading-relaxed">
                Select <strong>4 Pages</strong> or <strong>2 Pages</strong> per sheet on A4 paper with borders enabled to create pocket notes and double-sided revision handouts with minimal paper waste.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">🔄 Converting Photos to PDF:</p>
              <p className="text-slate-500 leading-relaxed">
                Use the built-in <strong>Cropper</strong> to straighten angles and trim background table shadows before combining into a crisp, unified PDF report.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">🔒 Security & Permissions:</p>
              <p className="text-slate-500 leading-relaxed">
                Set a user password to restrict unauthorized opening. You can also restrict content copying and print resolution under Advanced Permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="text-center pt-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-2">
          <span>PDFMaster Pro • High-Performance All-in-One PDF Suite</span>
          <span>•</span>
          <span>Engineered for Android 9+ & Modern Browsers</span>
        </div>
      </div>
    </footer>
  );
};
