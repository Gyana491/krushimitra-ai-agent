import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from './use-chat-messages';
import { chatDB } from '../lib/chat-db';

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export const useChatThreads = () => {
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [showThreadsList, setShowThreadsList] = useState(false);
  const [isPendingNewThread, setIsPendingNewThread] = useState(false);

  // Load chat threads from IndexedDB on mount with migration from localStorage
  useEffect(() => {
    const loadThreads = async () => {
      try {
        // First, try to migrate from localStorage if this is the first time
        await chatDB.migrateFromLocalStorage();
        await chatDB.migrateSuggestedQueriesFromLocalStorage();
        
        // Then load threads from IndexedDB
        const threads = await chatDB.getAllThreads();
        setChatThreads(threads);
        
        // Don't automatically set any thread ID on page load
        // Keep the selection empty so user can choose or start a new chat
      } catch (error) {
        console.error('Error loading chat threads from IndexedDB:', error);
        // Fallback to localStorage if IndexedDB fails
        const savedThreads = localStorage.getItem('farm-chat-threads');
        if (savedThreads) {
          try {
            const parsedThreads = JSON.parse(savedThreads);
            setChatThreads(parsedThreads);
          } catch (parseError) {
            console.error('Error parsing localStorage threads:', parseError);
          }
        }
      }
    };

    loadThreads();
  }, []);

  // Save threads to IndexedDB whenever they change
  useEffect(() => {
    const saveThreads = async () => {
      if (chatThreads.length > 0) {
        try {
          // Filter out any threads that have no messages before saving
          const threadsWithMessages = chatThreads.filter(thread => thread.messages && thread.messages.length > 0);
          
          if (threadsWithMessages.length > 0) {
            await chatDB.saveThreads(threadsWithMessages);
          }
        } catch (error) {
          console.error('Error saving threads to IndexedDB:', error);
          // Fallback to localStorage on IndexedDB error
          const threadsWithMessages = chatThreads.filter(thread => thread.messages && thread.messages.length > 0);
          if (threadsWithMessages.length > 0) {
            localStorage.setItem('farm-chat-threads', JSON.stringify(threadsWithMessages));
          }
        }
      }
    };

    // Don't save empty thread arrays, and debounce saves
    if (chatThreads.length > 0) {
      const timeoutId = setTimeout(saveThreads, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [chatThreads]);

  // Create a new thread ID in memory but do NOT add it to the threads list until it has messages
  const createNewThread = useCallback(() => {
    const newThreadId = `thread-${Date.now()}`;
    
    // Create a new thread with a default title - but don't add to state yet
    const newThread: ChatThread = {
      id: newThreadId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Set current thread ID without adding to threads list
    setCurrentThreadId(newThreadId);
    setIsPendingNewThread(false);
    
    // Don't persist current thread ID - keep it in memory only
    
    // DO NOT add to threads list yet - only add when it has messages
    // We'll add it to the state once it has messages in updateCurrentThread
    
    return newThreadId;
  }, []);

  // This function is kept for backward compatibility but just updates the thread title
  const createActualThread = useCallback((firstMessage?: ChatMessage) => {
    if (!currentThreadId) {
      return createNewThread();
    }
    
    // Just update the title of the existing thread
    if (firstMessage) {
      const title = firstMessage.content.length > 50 
        ? firstMessage.content.slice(0, 50) + '...' 
        : firstMessage.content;
      
      setChatThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, title, updatedAt: new Date().toISOString() }
          : thread
      ));
    }
    
    return currentThreadId;
  }, [currentThreadId, createNewThread]);

  // Simple thread switching - just set the current thread and return it
  const switchToThread = useCallback((threadId: string) => {
    const thread = chatThreads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThreadId(threadId);
      setShowThreadsList(false);
      setIsPendingNewThread(false);
      
      // Don't persist current thread ID - keep it in memory only
      
      return thread;
    }
    return null;
  }, [chatThreads]);

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      // Delete from IndexedDB first
      await chatDB.deleteThread(threadId);
    } catch (error) {
      console.error('Error deleting thread from IndexedDB:', error);
    }

    setChatThreads(prev => {
      const updatedThreads = prev.filter(t => t.id !== threadId);
      return updatedThreads;
    });

    if (threadId === currentThreadId) {
      const remainingThreads = chatThreads.filter(t => t.id !== threadId);
      if (remainingThreads.length > 0) {
        setCurrentThreadId(remainingThreads[0].id);
        setIsPendingNewThread(false);
        return remainingThreads[0];
      } else {
        // No threads left, set up pending new thread
        setCurrentThreadId('');
        setIsPendingNewThread(true);
        return null;
      }
    }
    return null;
  }, [chatThreads, currentThreadId]);

  // Simplified update thread function - just updates the messages and title
  const updateCurrentThread = useCallback((messages: ChatMessage[]) => {
    // Don't update or create threads with empty messages
    if (messages.length === 0) return; // Nothing to update
    
    // If no current thread, create a new one only if we have messages
    if (!currentThreadId) {
      // Only create a new thread if we have actual messages
      const newThreadId = createNewThread();
      
      // Then update it with messages and add it to the threads list
      setChatThreads(prev => {
        // Create new thread with messages
        const newThread: ChatThread = {
          id: newThreadId,
          title: messages[0]?.content 
            ? (messages[0].content.length > 50 
                ? messages[0].content.slice(0, 50) + '...' 
                : messages[0].content)
            : 'New Chat',
          messages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add new thread to beginning of list
        const updatedThreads = [newThread, ...prev];
        
        // Save to IndexedDB immediately (async)
        chatDB.saveThread(newThread).catch(error => {
          console.error('Error saving new thread to IndexedDB:', error);
          // Fallback to localStorage
          localStorage.setItem('farm-chat-threads', JSON.stringify(updatedThreads));
        });
        
        return updatedThreads;
      });
      return;
    }
    
    // Update existing thread with new messages
    setChatThreads(prev => {
      // Check if thread exists in current state
      const threadExists = prev.some(thread => thread.id === currentThreadId);
      
      let updatedThreads: ChatThread[];
      
      if (threadExists) {
        // Update existing thread
        updatedThreads = prev.map(thread => 
          thread.id === currentThreadId 
            ? { 
                ...thread, 
                messages, 
                updatedAt: new Date().toISOString(),
                title: messages[0]?.content 
                  ? (messages[0].content.length > 50 
                      ? messages[0].content.slice(0, 50) + '...' 
                      : messages[0].content)
                  : 'New Chat'
              }
            : thread
        );
      } else {
        // Thread ID exists but not in state - create a new thread with messages and add it
        const newThread: ChatThread = {
          id: currentThreadId,
          title: messages[0]?.content 
            ? (messages[0].content.length > 50 
                ? messages[0].content.slice(0, 50) + '...' 
                : messages[0].content)
            : 'New Chat',
          messages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add new thread to beginning of list
        updatedThreads = [newThread, ...prev];
      }
      
      // Save to IndexedDB immediately (async)
      if (updatedThreads.length > 0) {
        chatDB.saveThreads(updatedThreads).catch(error => {
          console.error('Error saving threads to IndexedDB:', error);
          // Fallback to localStorage
          localStorage.setItem('farm-chat-threads', JSON.stringify(updatedThreads));
        });
      }
      
      return updatedThreads;
    });
  }, [currentThreadId, createNewThread]);

  const clearCurrentThread = useCallback(() => {
    setCurrentThreadId('');
    setIsPendingNewThread(false);
  }, []);

  const exportThreads = useCallback(async () => {
    try {
      const threads = await chatDB.exportThreads();
      const dataStr = JSON.stringify(threads, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `farm-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting threads:', error);
      // Fallback to current state
      const dataStr = JSON.stringify(chatThreads, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `farm-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [chatThreads]);

  const importThreads = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedThreads = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedThreads)) {
            // Import to IndexedDB
            await chatDB.importThreads(importedThreads);
            
            // Update local state
            setChatThreads(prev => [...importedThreads, ...prev]);
          }
        } catch (error) {
          console.error('Error importing threads:', error);
          alert('Error importing chat threads. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  }, []);

  const getCurrentThread = useCallback((): ChatThread | null => {
    return chatThreads.find(t => t.id === currentThreadId) || null;
  }, [chatThreads, currentThreadId]);

  return {
    currentThreadId,
    chatThreads,
    showThreadsList,
    setShowThreadsList,
    createNewThread,
    createActualThread,
    switchToThread,
    deleteThread,
    updateCurrentThread,
    clearCurrentThread,
    exportThreads,
    importThreads,
    getCurrentThread,
    isPendingNewThread
  };
};
