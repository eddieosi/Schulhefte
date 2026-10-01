import React, { useState, useEffect } from 'react';
import { Notebook, User } from './types/notebook';
import { NotebookShelf } from './components/NotebookShelf';
import { NotebookView } from './components/NotebookView';
import { TutorialModal } from './components/TutorialModal';
import { LoginView } from './components/LoginView';
import { VersionUpdateBanner } from './components/VersionUpdateBanner';
import { api, getStoredUser } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeShelfUser, setActiveShelfUser] = useState<string>('');

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [targetPageId, setTargetPageId] = useState<string | undefined>(undefined);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('schulheft_theme') === 'dark';
  });

  // Tutorial Modal
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => {
    return !localStorage.getItem('schulheft_tutorial_seen');
  });

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('schulheft_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('schulheft_theme', 'light');
    }
  }, [isDarkMode]);

  // Load notebooks for a specific user (or currently active shelf user)
  const loadNotebooks = async (targetUser?: string) => {
    setIsLoading(true);
    try {
      const u = targetUser || activeShelfUser || currentUser?.username;
      const data = await api.getNotebooks(u);
      setNotebooks(data);
    } catch (err) {
      console.error('Failed to load notebooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load users list if admin
  const loadAllUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch {}
  };

  // Check initial authentication on mount
  useEffect(() => {
    api.getMe()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          setActiveShelfUser(user.username);
          loadNotebooks(user.username);
          if (user.role === 'admin') {
            loadAllUsers();
          }
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveShelfUser(user.username);
    loadNotebooks(user.username);
    if (user.role === 'admin') {
      loadAllUsers();
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setNotebooks([]);
    setSelectedNotebookId(null);
    setTargetPageId(undefined);
  };

  const handleShelfUserChange = (username: string) => {
    setActiveShelfUser(username);
    loadNotebooks(username);
  };

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    localStorage.setItem('schulheft_tutorial_seen', 'true');
  };

  const handleSelectNotebook = (id: string, pageId?: string) => {
    setSelectedNotebookId(id);
    setTargetPageId(pageId);
  };

  const handleBackToShelf = () => {
    setSelectedNotebookId(null);
    setTargetPageId(undefined);
    loadNotebooks();
  };

  // Loading spinner during auth check
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center text-stone-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Schulhefte werden geladen...</p>
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 font-sans antialiased text-stone-900 dark:text-stone-100">
      {selectedNotebookId ? (
        <NotebookView
          notebookId={selectedNotebookId}
          initialPageId={targetPageId}
          onBack={handleBackToShelf}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        />
      ) : (
        <NotebookShelf
          currentUser={currentUser}
          onLogout={handleLogout}
          notebooks={notebooks}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          onSelectNotebook={handleSelectNotebook}
          onRefresh={() => {
            loadNotebooks();
            if (currentUser.role === 'admin') loadAllUsers();
          }}
          activeShelfUser={activeShelfUser}
          onShelfUserChange={handleShelfUserChange}
          allUsers={allUsers}
        />
      )}

      {/* Interactive Onboarding Tutorial */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />

      {/* PWA Auto-Update Banner */}
      <VersionUpdateBanner />
    </div>
  );
}
