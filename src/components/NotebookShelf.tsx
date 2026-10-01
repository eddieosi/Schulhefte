import React, { useState, useEffect, useMemo } from 'react';
import { Notebook, SearchResult, RulingType, User } from '../types/notebook';
import { NotebookCover } from './NotebookCover';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { UserManagementModal } from './UserManagementModal';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Moon, 
  Sun, 
  HelpCircle, 
  CloudDownload, 
  ArrowUpDown,
  X,
  FolderOpen,
  Edit3,
  Users,
  LogOut,
  ShieldCheck,
  RefreshCw,
  User as UserIcon
} from 'lucide-react';
import { api } from '../services/api';

interface NotebookShelfProps {
  currentUser: User;
  onLogout: () => void;
  notebooks: Notebook[];
  isLoading: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenTutorial: () => void;
  onSelectNotebook: (notebookId: string, initialPageId?: string) => void;
  onRefresh: () => void;
  activeShelfUser?: string;
  onShelfUserChange?: (username: string) => void;
  allUsers?: User[];
}

type SortOption = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc' | 'subject' | 'pages_desc';

export const NotebookShelf: React.FC<NotebookShelfProps> = ({
  currentUser,
  onLogout,
  notebooks,
  isLoading,
  isDarkMode,
  onToggleDarkMode,
  onOpenTutorial,
  onSelectNotebook,
  onRefresh,
  activeShelfUser,
  onShelfUserChange,
  allUsers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('Alle');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // New Notebook Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Mathematik');
  const [newClass, setNewClass] = useState('Klasse 8b');
  const [newColor, setNewColor] = useState('#1e40af');
  const [newRuling, setNewRuling] = useState<RulingType>('kariert');

  // Edit Notebook Modal state
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editRuling, setEditRuling] = useState<RulingType>('kariert');

  // Delete Notebook Modal state
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);

  // Backup / Cloud Sync Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Version & PWA Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusNotice, setUpdateStatusNotice] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusNotice(null);
    try {
      window.dispatchEvent(new CustomEvent('trigger-version-check'));

      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update().catch(() => {});
        }
      }

      const res = await fetch('/api/version', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        const currentBuildTime = sessionStorage.getItem('schulheft_initial_build_time');
        if (currentBuildTime && data.buildTime && currentBuildTime !== data.buildTime) {
          setUpdateStatusNotice('Neues Update gefunden! Siehe Banner unten.');
        } else {
          setUpdateStatusNotice(`Version ${data.version || '1.4.0'} ist aktuell`);
        }
      } else {
        setUpdateStatusNotice('App ist auf dem neuesten Stand');
      }
    } catch {
      setUpdateStatusNotice('Offline — Lokale Version wird genutzt');
    } finally {
      setIsCheckingUpdate(false);
      setTimeout(() => setUpdateStatusNotice(null), 3500);
    }
  };

  // Subject list
  const subjects = ['Alle', ...Array.from(new Set(notebooks.map(n => n.subject).filter(Boolean)))];

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.search(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.createNotebook({
        title: newTitle.trim(),
        subject: newSubject,
        classLevel: newClass,
        coverColor: newColor,
        ruling: newRuling,
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      onRefresh();
      onSelectNotebook(created.id);
    } catch (err) {
      console.error('Failed to create notebook:', err);
    }
  };

  const handleStartEdit = (nb: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNotebook(nb);
    setEditTitle(nb.title);
    setEditSubject(nb.subject);
    setEditClass(nb.classLevel);
    setEditColor(nb.coverColor);
    setEditRuling(nb.ruling);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotebook || !editTitle.trim()) return;

    try {
      await api.updateNotebook(editingNotebook.id, {
        title: editTitle.trim(),
        subject: editSubject,
        classLevel: editClass,
        coverColor: editColor,
        ruling: editRuling,
      });
      setEditingNotebook(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update notebook:', err);
    }
  };

  const handleDeleteNotebook = (nb: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotebookToDelete(nb);
  };

  const confirmDeleteNotebook = async () => {
    if (!notebookToDelete) return;
    try {
      await api.deleteNotebook(notebookToDelete.id);
      setNotebookToDelete(null);
      onRefresh();
    } catch (err) {
      console.error('Delete notebook failed:', err);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const count = await api.restoreBackup(json);
          setRestoreStatus(`${count} Hefte erfolgreich importiert!`);
          setTimeout(() => {
            setRestoreStatus(null);
            setIsBackupModalOpen(false);
            onRefresh();
          }, 1500);
        } catch {
          setRestoreStatus('Fehlerhafte Sicherungsdatei.');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Restore failed:', err);
    }
  };

  // Filter & Sort notebooks
  const processedNotebooks = useMemo(() => {
    let list = notebooks.filter(nb => {
      if (selectedSubject === 'Alle') return true;
      return nb.subject === selectedSubject;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'title_asc':
          return a.title.localeCompare(b.title, 'de');
        case 'title_desc':
          return b.title.localeCompare(a.title, 'de');
        case 'subject':
          return a.subject.localeCompare(b.subject, 'de');
        case 'pages_desc':
          return (b.pageIds?.length || 0) - (a.pageIds?.length || 0);
        case 'updated_asc':
          return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        case 'updated_desc':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    return list;
  }, [notebooks, selectedSubject, sortBy]);

  const colorPalette = [
    { label: 'Königsblau', value: '#1e40af' },
    { label: 'Karmesinrot', value: '#b91c1c' },
    { label: 'Smaragdgrün', value: '#047857' },
    { label: 'Bernstein', value: '#b45309' },
    { label: 'Violett', value: '#6b21a8' },
    { label: 'Schiefergrau', value: '#334155' },
    { label: 'Ozeanblau', value: '#0369a1' },
    { label: 'Kastanienbraun', value: '#78350f' },
  ];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-200">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
              Schulheft Pro
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                PWA & Android
              </span>
            </h1>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
              Dateibasiertes Schulheft für Stifteingabe & Geometrie
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative max-w-md w-full mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Volltextsuche in Heften & Handschrift (OCR)..."
              className="w-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white text-xs pl-9 pr-9 py-2 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-2 z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-stone-500">
                  Durchsuche alle Hefte und OCR-Handschriften...
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-stone-400">
                    {searchResults.length} Treffer gefunden:
                  </div>
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => onSelectNotebook(res.notebookId, res.pageId)}
                      className="px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-stone-900 dark:text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: res.coverColor }}
                          />
                          {res.notebookTitle} — Seite {res.pageNumber}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                          {res.snippet}
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                        Öffnen ➔
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-stone-500">
                  Keine Einträge für "{searchQuery}" gefunden.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Offline / Sync Status */}
          <OfflineIndicator />

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Version & PWA Update Check Button */}
          <button
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdate}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95 relative"
            title="Auf App-Updates prüfen (PWA & Version)"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>

          {/* Cloud / Backup Sync Modal trigger */}
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Dateien & Sicherung synchronisieren"
          >
            <CloudDownload className="w-4 h-4" />
          </button>

          {/* Interactive Tutorial Button */}
          <button
            onClick={onOpenTutorial}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Interaktives Tutorial & Hilfestellung"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Dark Mode Switch */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title={isDarkMode ? 'Heller Modus' : 'Dunkler Modus'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-stone-200 dark:bg-stone-800 mx-1 hidden sm:block" />

          {/* Admin User Management Button */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold shadow-sm transition active:scale-95"
              title="Benutzerverwaltung öffnen (Schüler anlegen & verwalten)"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Benutzer</span>
            </button>
          )}

          {/* User Info Chip */}
          <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 select-none">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              {currentUser.displayName.charAt(0).toUpperCase() || currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 max-w-[80px] sm:max-w-[120px] truncate leading-tight">
                {currentUser.displayName}
              </span>
              <span className="text-[9px] text-stone-400 leading-none">
                {currentUser.role === 'admin' ? 'Admin' : 'Schüler'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Update Check Status Toast */}
      {updateStatusNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-semibold shadow-2xl border border-stone-700 dark:border-stone-300 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>{updateStatusNotice}</span>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 pb-28">
        {/* Subject Filter & Sort & Add Action bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 w-full md:w-auto scrollbar-none">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  selectedSubject === s
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort Dropdown, Admin User Switcher & New Notebook Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {/* Admin User Switcher */}
            {currentUser.role === 'admin' && allUsers && allUsers.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-purple-200 dark:border-purple-800 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
                <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                <label htmlFor="user-select" className="text-stone-500 text-[11px] hidden sm:inline">Benutzer:</label>
                <select
                  id="user-select"
                  value={activeShelfUser || currentUser.username}
                  onChange={(e) => onShelfUserChange?.(e.target.value)}
                  className="bg-transparent text-purple-700 dark:text-purple-300 font-semibold outline-none cursor-pointer text-xs"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.displayName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <label htmlFor="sort-select" className="text-stone-500 text-[11px] hidden sm:inline">Sortieren:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-stone-800 dark:text-stone-200 font-semibold outline-none cursor-pointer text-xs"
              >
                <option value="updated_desc">Zuletzt bearbeitet</option>
                <option value="title_asc">Titel (A bis Z)</option>
                <option value="title_desc">Titel (Z bis A)</option>
                <option value="subject">Nach Schulfach</option>
                <option value="pages_desc">Meiste Seiten</option>
                <option value="updated_asc">Älteste zuerst</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Heft</span>
            </button>
          </div>
        </div>

        {/* Notebooks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
            ))}
          </div>
        ) : processedNotebooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
            {processedNotebooks.map(nb => (
              <NotebookCover
                key={nb.id}
                notebook={nb}
                onClick={() => onSelectNotebook(nb.id)}
                onEdit={(e) => handleStartEdit(nb, e)}
                onDelete={(e) => handleDeleteNotebook(nb, e)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
              Kein Schulheft gefunden
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mt-1 mb-4">
              Erstelle ein neues digitales Schulheft mit Karomuster, Linien oder Blankoseiten für deine Unterrichtsfächer.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Heft anlegen</span>
            </button>
          </div>
        )}
      </main>

      {/* CREATE NOTEBOOK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Neues Schulheft anlegen
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Titel des Heftes
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z.B. Mathematik & Geometrie, Deutsch Aufsätze..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Schulfach
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mathematik">Mathematik</option>
                    <option value="Deutsch">Deutsch</option>
                    <option value="Englisch">Englisch</option>
                    <option value="Biologie">Biologie</option>
                    <option value="Physik">Physik</option>
                    <option value="Chemie">Chemie</option>
                    <option value="Geschichte">Geschichte</option>
                    <option value="Geographie">Geographie</option>
                    <option value="Kunst">Kunst</option>
                    <option value="Musik">Musik</option>
                    <option value="Allgemein">Allgemein / Notizen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Klasse / Schuljahr
                  </label>
                  <input
                    type="text"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    placeholder="z.B. Klasse 8b"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ruling */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Lineatur der Seiten
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'kariert', label: '5mm Kariert (Mathe)' },
                    { id: 'kariert_gross', label: '7mm Kariert (Grundschule)' },
                    { id: 'liniert_rand', label: 'Liniert + Korrekturrand' },
                    { id: 'liniert', label: 'Liniert Standard' },
                    { id: 'punkte', label: 'Punkteraster (Dot Grid)' },
                    { id: 'vokabeln', label: 'Vokabelheft (2 Spalten)' },
                    { id: 'noten', label: 'Notenlinien' },
                    { id: 'blanko', label: 'Blanko (Weiß)' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setNewRuling(r.id as RulingType)}
                      className={`p-2 rounded-xl text-left border transition ${
                        newRuling === r.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Color */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Umschlagfarbe (Heftdecke)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPalette.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColor(c.value)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newColor === c.value ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition"
                >
                  Heft anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT NOTEBOOK MODAL */}
      {editingNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Schulheft bearbeiten
              </h2>
              <button
                onClick={() => setEditingNotebook(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Titel des Heftes
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Schulfach
                  </label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mathematik">Mathematik</option>
                    <option value="Deutsch">Deutsch</option>
                    <option value="Englisch">Englisch</option>
                    <option value="Biologie">Biologie</option>
                    <option value="Physik">Physik</option>
                    <option value="Chemie">Chemie</option>
                    <option value="Geschichte">Geschichte</option>
                    <option value="Geographie">Geographie</option>
                    <option value="Kunst">Kunst</option>
                    <option value="Musik">Musik</option>
                    <option value="Allgemein">Allgemein / Notizen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Klasse / Schuljahr
                  </label>
                  <input
                    type="text"
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ruling */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Standard-Lineatur
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'kariert', label: '5mm Kariert (Mathe)' },
                    { id: 'kariert_gross', label: '7mm Kariert (Grundschule)' },
                    { id: 'liniert_rand', label: 'Liniert + Korrekturrand' },
                    { id: 'liniert', label: 'Liniert Standard' },
                    { id: 'punkte', label: 'Punkteraster (Dot Grid)' },
                    { id: 'vokabeln', label: 'Vokabelheft (2 Spalten)' },
                    { id: 'noten', label: 'Notenlinien' },
                    { id: 'blanko', label: 'Blanko (Weiß)' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setEditRuling(r.id as RulingType)}
                      className={`p-2 rounded-xl text-left border transition ${
                        editRuling === r.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Color */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Umschlagfarbe (Heftdecke)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPalette.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEditColor(c.value)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editColor === c.value ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNotebook(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOUD / BACKUP SYNC MODAL */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <CloudDownload className="w-5 h-5 text-blue-600" />
                Cloud-Sync & Datensicherung
              </h2>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-600 dark:text-stone-300">
              <p>
                Deine Schulhefte werden auf dem Server in separaten Ordnern als JSON-Dateien abgelegt und zusätzlich im lokalen Browser-Speicher synchronisiert.
              </p>

              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-300">Komplettsicherung herunterladen</h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400">Exportiert alle Schulhefte & Seiten als JSON</p>
                </div>
                <button
                  onClick={() => api.downloadBackup()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  Herunterladen
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                <h4 className="font-bold text-stone-900 dark:text-stone-200 mb-1">Sicherung wiederherstellen</h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3">Lade eine zuvor exportierte JSON-Sicherung hoch</p>
                <label className="block">
                  <span className="sr-only">Datei auswählen</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileRestore}
                    className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-stone-200 dark:file:bg-stone-700 file:text-stone-700 dark:file:text-stone-200 hover:file:bg-stone-300 cursor-pointer"
                  />
                </label>
                {restoreStatus && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {restoreStatus}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end mt-4">
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE NOTEBOOK CONFIRMATION MODAL */}
      {notebookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white">
            <h3 className="text-base font-bold mb-2">Schulheft löschen?</h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">
              Möchtest du das Schulheft <strong>"{notebookToDelete.title}"</strong> mit allen zugehörigen Seiten und Bildern wirklich unwiderruflich löschen?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotebookToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDeleteNotebook}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition"
              >
                Ja, Heft löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT MODAL (ADMIN ONLY) */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
        onUsersChanged={onRefresh}
      />
    </div>
  );
};
