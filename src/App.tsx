import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TabBar } from './components/TabBar';
import { PWAInstallModal } from './components/PWAInstallModal';
import { FooterInfo } from './components/FooterInfo';
import { LayoutTool } from './components/tools/LayoutTool';
import { RemovePagesTool } from './components/tools/RemovePagesTool';
import { CompressTool } from './components/tools/CompressTool';
import { ConverterTool } from './components/tools/ConverterTool';
import { MergeSplitTool } from './components/tools/MergeSplitTool';
import { SecurityTool } from './components/tools/SecurityTool';
import { SignWatermarkTool } from './components/tools/SignWatermarkTool';
import { WifiOff } from 'lucide-react';
import type { ActiveTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('layout');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Initialize theme and tab from localStorage/URL
  useEffect(() => {
    const savedTheme = localStorage.getItem('pdfMasterTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(initialDark);
    document.documentElement.classList.toggle('dark', initialDark);

    // Read initial tab from URL or localStorage
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as ActiveTab;
      const validTabs: ActiveTab[] = [
        'layout',
        'remove',
        'compress',
        'converter',
        'mergeSplit',
        'security',
        'signWatermark',
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      } else {
        const savedTab = localStorage.getItem('pdfMasterLastTab') as ActiveTab;
        if (savedTab && validTabs.includes(savedTab)) {
          setActiveTab(savedTab);
        }
      }
    } catch {
      // Ignored
    }

    // Online status listener
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('pdfMasterTheme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    localStorage.setItem('pdfMasterLastTab', tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignored
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Offline Status Badge */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 shadow-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode Active • PDF tools continue to work 100% locally on your device!</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Hero Badge Banner */}
      <section className="pt-6 pb-2 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-3 shadow-xs">
          <span>⚡ High-Performance PDF Engine</span>
          <span>•</span>
          <span>Fast on Android 9+ & Desktop</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          All-in-One Professional PDF Toolkit
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Compress, merge, split, convert photos, remove pages, layout N-up sheets, and sign documents securely in your browser.
        </p>
      </section>

      {/* Interactive Tool Tab Bar */}
      <TabBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Main Tool Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6">
        {activeTab === 'layout' && <LayoutTool />}
        {activeTab === 'remove' && <RemovePagesTool />}
        {activeTab === 'compress' && <CompressTool />}
        {activeTab === 'converter' && <ConverterTool />}
        {activeTab === 'mergeSplit' && <MergeSplitTool />}
        {activeTab === 'security' && <SecurityTool />}
        {activeTab === 'signWatermark' && <SignWatermarkTool />}
      </main>

      {/* Footer Info & Guides */}
      <FooterInfo />

      {/* PWA Install Modal */}
      <PWAInstallModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />
    </div>
  );
}
