import { useEffect } from 'react';

export const useKeyboardShortcuts = (
  clearCurrentThread: () => void,
  createNewThread: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to clear current thread
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearCurrentThread();
      }
      // Ctrl/Cmd + N to create new thread
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewThread();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearCurrentThread, createNewThread]);
};
