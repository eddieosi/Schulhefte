import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  RefreshCw, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { getStoredToken } from '../services/api';

export interface BackendLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: 'AUTH' | 'NOTEBOOK' | 'SYNC' | 'SYSTEM' | 'API';
  message: string;
  user?: string;
  ip?: string;
}

interface AdminLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLogModal: React.FC<AdminLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<BackendLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = getStoredToken();
      let res: Response | null = null;
      if (token) {
        try {
          res = await fetch('/api/admin/logs?limit=250', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
            },
          });
        } catch {}
      }

      if (!res || !res.ok) {
        res = await fetch('/api/system/logs?limit=250', {
          headers: { 'Cache-Control': 'no-cache' },
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

  if (!isOpen) return null;

  const handleClearLogs = async () => {
    if (!confirm('Möchtest du die Server-Logs wirklich leeren?')) return;
    try {
      const token = getStoredToken();
      await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLogs();
    } catch {}
  };

  const handleDownload = () => {
    const token = getStoredToken();
    window.open(`/api/admin/logs/download?token=${token}`, '_blank');
  };

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level}] [${l.category}] ${l.user ? `[User: ${l.user}] ` : ''}${l.message}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (log.message || '').toLowerCase().includes(q) ||
        (log.user && log.user.toLowerCase().includes(q)) ||
        (log.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[85vh] rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl text-stone-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-md">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Backend-Log</h3>
                <span className="px-2 py-0.5 rounded-full bg-stone-800 text-[11px] font-mono text-stone-400">
                  {filteredLogs.length} Einträge
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Ereignisse, Anmeldungen, Schulheft-Aktionen & Systemmeldungen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
              }`}
              title="Live-Aktualisierung alle 4 Sekunden"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'}`} />
              <span>{autoRefresh ? 'Live AN' : 'Live AUS'}</span>
            </button>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
              title="Aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={handleCopyLogs}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
              title="Gefilterte Logs in Zwischenablage kopieren"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
              title="Logdatei herunterladen (.log)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearLogs}
              className="p-2 rounded-xl text-stone-400 hover:text-red-400 hover:bg-red-950/30 transition"
              title="Logs leeren"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-stone-800 mx-1" />

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Logs durchsuchen (Benutzer, Aktion, Fehler...)"
              className="w-full pl-9 pr-4 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-blue-500"
            />
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  levelFilter === lvl
                    ? lvl === 'ERROR'
                      ? 'bg-red-600 text-white'
                      : lvl === 'WARN'
                      ? 'bg-amber-600 text-white'
                      : lvl === 'INFO'
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-100 text-stone-900'
                    : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                {lvl === 'ALL' ? 'Alle' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Log Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin select-text bg-stone-950">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-500 py-12">
              <Terminal className="w-8 h-8 mb-2 opacity-40" />
              <p>Keine Logeinträge gefunden</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const dateStr = (log.timestamp || '').split('T')[1]?.replace('Z', '') || log.timestamp || '00:00:00';
              return (
                <div
                  key={log.id || `log-${idx}`}
                  className="flex items-start gap-2.5 py-1 px-2.5 rounded-lg hover:bg-stone-900/80 transition-colors leading-relaxed group"
                >
                  <span className="text-stone-500 text-[11px] shrink-0 select-none">
                    {dateStr}
                  </span>

                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 select-none ${
                      log.level === 'ERROR'
                        ? 'bg-red-950 text-red-400 border border-red-800/60'
                        : log.level === 'WARN'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                    }`}
                  >
                    {log.level}
                  </span>

                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 shrink-0 font-semibold select-none">
                    {log.category}
                  </span>

                  {log.user && (
                    <span className="text-indigo-400 text-[11px] font-bold shrink-0">
                      @{log.user}
                    </span>
                  )}

                  <span
                    className={`flex-1 break-all ${
                      log.level === 'ERROR'
                        ? 'text-red-300 font-semibold'
                        : log.level === 'WARN'
                        ? 'text-amber-200'
                        : 'text-stone-200'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 border-t border-stone-800 bg-stone-950 text-[11px] text-stone-500 flex items-center justify-between shrink-0">
          <span>Tipp: Der Server speichert das vollständige Log auch in <code>data/logs/server.log</code></span>
          <span>Docker: <code>docker compose logs -f</code></span>
        </div>
      </div>
    </div>
  );
};
