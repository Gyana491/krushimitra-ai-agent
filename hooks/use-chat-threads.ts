import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from './use-chat-messages';

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

  // Load chat threads from localStorage on mount
  useEffect(() => {
    const savedThreads = localStorage.getItem('farm-chat-threads');
    const savedCurrentThreadId = localStorage.getItem('farm-chat-current-thread');
    
    if (savedThreads) {
      try {
        const parsedThreads = JSON.parse(savedThreads);
        setChatThreads(parsedThreads);
        
        if (savedCurrentThreadId && parsedThreads.find((t: ChatThread) => t.id === savedCurrentThreadId)) {
          setCurrentThreadId(savedCurrentThreadId);
        } else if (parsedThreads.length > 0) {
          const mostRecent = parsedThreads[0];
          setCurrentThreadId(mostRecent.id);
        } else {
          // No threads exist, set pending new thread state
          setIsPendingNewThread(true);
        }
      } catch (error) {
        console.error('Error loading chat threads:', error);
      }
    } else {
      // No saved threads, set pending new thread state
      setIsPendingNewThread(true);
    }
  }, []);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (chatThreads.length > 0) {
      localStorage.setItem('farm-chat-threads', JSON.stringify(chatThreads));
    }
    if (currentThreadId) {
      localStorage.setItem('farm-chat-current-thread', currentThreadId);
    }
  }, [chatThreads, currentThreadId]);

  const createNewThread = useCallback(() => {
    // Instead of creating a thread immediately, set up pending state
    setCurrentThreadId('');
    setIsPendingNewThread(true);
    return ''; // Return empty string to indicate pending state
  }, []);

  const createActualThread = useCallback((firstMessage?: ChatMessage) => {
    const newThreadId = `thread-${Date.now()}`;
    const title = firstMessage?.content 
      ? (firstMessage.content.length > 50 
          ? firstMessage.content.slice(0, 50) + '...' 
          : firstMessage.content)
      : 'New Chat';
    
    const newThread: ChatThread = {
      id: newThreadId,
      title,
      messages: firstMessage ? [firstMessage] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setChatThreads(prev => [newThread, ...prev]);
    setCurrentThreadId(newThreadId);
    setIsPendingNewThread(false);
    return newThreadId;
  }, []);

  const switchToThread = useCallback((threadId: string) => {
    const thread = chatThreads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThreadId(threadId);
      setShowThreadsList(false);
      setIsPendingNewThread(false); // Ensure we're not in pending new thread state
      return thread;
    }
    return null;
  }, [chatThreads]);

  const deleteThread = useCallback((threadId: string) => {
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

  const updateCurrentThread = useCallback((messages: ChatMessage[]) => {
    if (messages.length > 0) {
      if (isPendingNewThread) {
        // Create the actual thread now that we have a message
        createActualThread(messages[0]);
      } else if (currentThreadId) {
        // Update existing thread
        setChatThreads(prev => prev.map(thread => 
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
        ));
      }
    }
  }, [currentThreadId, isPendingNewThread, createActualThread]);

  const clearCurrentThread = useCallback(() => {
    if (currentThreadId) {
      setChatThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, messages: [], title: 'New Chat', updatedAt: new Date().toISOString() }
          : thread
      ));
    }
  }, [currentThreadId]);

  const exportThreads = useCallback(() => {
    const dataStr = JSON.stringify(chatThreads, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farm-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [chatThreads]);

  const importThreads = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedThreads = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedThreads)) {
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

  const getCurrentThread = useCallback(() => {
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
