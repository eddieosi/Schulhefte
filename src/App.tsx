import React, { useState, useEffect } from 'react';
import { Notebook } from './types/notebook';
import { NotebookShelf } from './components/NotebookShelf';
import { NotebookView } from './components/NotebookView';
import { TutorialModal } from './components/TutorialModal';
import { api } from './services/api';

export default function App() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // Load notebooks
  const loadNotebooks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotebooks();
      setNotebooks(data);
    } catch (err) {
      console.error('Failed to load notebooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotebooks();
  }, []);

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
          notebooks={notebooks}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          onSelectNotebook={handleSelectNotebook}
          onRefresh={loadNotebooks}
        />
      )}

      {/* Interactive Onboarding Tutorial */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
