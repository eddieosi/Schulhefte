import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { processSyncQueue } from '../services/api';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const count = await processSyncQueue();
      if (count > 0) {
        setSyncSuccessMessage(`${count} Änderungen synchronisiert!`);
        setTimeout(() => setSyncSuccessMessage(null), 3000);
      } else {
        setSyncSuccessMessage('Alle Daten sind aktuell.');
        setTimeout(() => setSyncSuccessMessage(null), 2500);
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOnline) {
      // Trigger background sync when returning online
      handleManualSync();
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-amber-400/30 animate-pulse">
        <CloudOff className="w-4 h-4" />
        <span>Offline-Modus — Alle Notizen werden lokal gesichert</span>
      </div>
    );
  }

  if (syncSuccessMessage) {
    return (
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-emerald-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-emerald-400/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CheckCircle2 className="w-4 h-4" />
        <span>{syncSuccessMessage}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleManualSync}
      disabled={isSyncing}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800"
      title="Automatische Cloud-Synchronisation mit Server"
    >
      <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : 'text-emerald-500'}`} />
      <span className="hidden lg:inline">{isSyncing ? 'Synchronisiere...' : 'Synchronisiert'}</span>
    </button>
  );
};
