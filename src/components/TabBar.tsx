import React from 'react';
import { LayoutGrid, Scissors, FileArchive, ArrowLeftRight, Layers, Lock, PenTool, Smartphone } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import type { ActiveTab } from '../types';

interface TabBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onSelectTab }) => {
  const { triggerHaptic } = useHaptic();

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'layout', label: 'Layout', icon: LayoutGrid },
    { id: 'remove', label: 'Remove & Reorder', icon: Scissors },
    { id: 'compress', label: 'Compress PDF', icon: FileArchive },
    { id: 'converter', label: 'JPG ⇄ PDF', icon: ArrowLeftRight },
    { id: 'mergeSplit', label: 'Merge & Split', icon: Layers },
    { id: 'security', label: 'Password', icon: Lock },
    { id: 'signWatermark', label: 'Sign & Watermark', icon: PenTool },
    { id: 'apkConverter', label: 'APK Maker (Blogger)', icon: Smartphone },
  ];

  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md mb-6">
      <div className="max-w-6xl mx-auto px-2 sm:px-6">
        <nav
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth snap-x snap-mandatory"
          aria-label="PDF Tools"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  onSelectTab(tab.id);
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all snap-start shrink-0 select-none active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
