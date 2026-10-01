import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X, CheckCircle, AlertCircle } from 'lucide-react';

export const VersionUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Listen for Service Worker update event from virtual:pwa-register
    const handlePwaUpdate = () => {
      setUpdateAvailable(true);
    };
    window.addEventListener('pwa-update-available', handlePwaUpdate);

    // 2. Initial build time recorded when this client session loaded
    let initialBuildTime = sessionStorage.getItem('schulheft_initial_build_time');

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.buildTime) {
            if (!initialBuildTime) {
              initialBuildTime = data.buildTime;
              sessionStorage.setItem('schulheft_initial_build_time', data.buildTime);
              localStorage.setItem('schulheft_current_version', data.version || '1.4.0');
            } else if (initialBuildTime !== data.buildTime) {
              setUpdateAvailable(true);
              setNewVersion(data.version || null);
            }
          }
        }
      } catch (err) {
        // Offline or unreachable
      }
    };

    // Check on mount
    checkVersion();

    // Check every 30 seconds
    const interval = setInterval(checkVersion, 30000);

    // Check when window/tab regains focus or visibility
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Manual check trigger from UI (e.g. settings or shelf button)
    const handleManualCheck = () => {
      checkVersion();
    };
    window.addEventListener('trigger-version-check', handleManualCheck);

    return () => {
      window.removeEventListener('pwa-update-available', handlePwaUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('trigger-version-check', handleManualCheck);
      clearInterval(interval);
    };
  }, []);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);

    try {
      // 1. Trigger Service Worker update
      if (typeof (window as any).__updatePWA === 'function') {
        await (window as any).__updatePWA(true);
      }

      // 2. Unregister or update all service worker registrations
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update().catch(() => {});
        }
      }

      // 3. Clear cache storage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 4. Clear stored session state
      sessionStorage.removeItem('schulheft_initial_build_time');
      localStorage.removeItem('schulheft_build_time');
    } catch (e) {
      console.error('Update apply error:', e);
    }

    // 5. Force cache-busting reload
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  if (!updateAvailable || isDismissed) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-stone-900/95 dark:bg-white/95 backdrop-blur-xl text-white dark:text-stone-900 px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/40 dark:border-blue-400/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ring-4 ring-blue-500/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold truncate flex items-center gap-1.5">
            <span>Neues App-Update verfügbar!</span>
            {newVersion && (
              <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 dark:text-blue-700 text-[10px] font-mono">
                v{newVersion}
              </span>
            )}
          </div>
          <div className="text-[11px] text-stone-300 dark:text-stone-600 truncate">
            Neue Funktionen & Verbesserungen bereit
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Lädt...' : 'Aktualisieren'}</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg text-stone-400 hover:text-white dark:hover:text-stone-900 transition"
          title="Später erinnern"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
