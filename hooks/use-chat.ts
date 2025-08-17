import { useState, useEffect } from 'react';
import { useChatMessages } from './use-chat-messages';
import { useChatThreads } from './use-chat-threads';
import { useImageUpload } from './use-image-upload';
import { useChatAPI } from './use-chat-api';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';

export const useChat = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>('');

  // Use individual hooks
  const {
    messages,
    status,
    streamingState,
    setStatus,
    setStreamingState,
    addMessage,
    clearMessages,
    updateMessages
  } = useChatMessages();

  const {
    currentThreadId,
    chatThreads,
    showThreadsList,
    setShowThreadsList,
    createNewThread,
    createActualThread,
    switchToThread,
    deleteThread,
    updateCurrentThread,
    clearCurrentThread: clearThread,
    exportThreads,
    importThreads,
    getCurrentThread,
    isPendingNewThread
  } = useChatThreads();

  const {
    selectedImages,
    handleImageUpload,
    removeImage,
    clearImages,
    triggerImageUpload,
    formatFileSize
  } = useImageUpload();

  const { sendMessage: sendApiMessage } = useChatAPI();

  // Initialize thread on mount or when currentThreadId changes
  useEffect(() => {
    if (currentThreadId) {
      const currentThread = getCurrentThread();
      if (currentThread) {
        updateMessages(currentThread.messages);
      }
    } else if (!isPendingNewThread && chatThreads.length === 0) {
      // Create initial pending thread if none exists and not already pending
      createNewThread();
    } else if (!isPendingNewThread && !currentThreadId && chatThreads.length > 0) {
      // Only switch to the most recent thread if no current thread is selected
      // This prevents auto-switching when a thread is already selected
      const mostRecent = chatThreads[0];
      switchToThread(mostRecent.id);
    }
  }, [currentThreadId, chatThreads.length, isPendingNewThread, createNewThread, getCurrentThread, switchToThread, updateMessages]);

  // Update current thread when messages change (only if we have messages or not pending)
  useEffect(() => {
    if (messages.length > 0 && currentThreadId) {
      // Only update if we have both messages and a current thread ID
      updateCurrentThread(messages);
    }
  }, [messages, updateCurrentThread, currentThreadId]);

  // Console logging
  useEffect(() => {
    console.log('Status:', status);
    console.log('Messages:', messages);
    console.log('Total messages in thread:', messages.length);
    console.log('Current thread ID:', currentThreadId);
    console.log('Is pending new thread:', isPendingNewThread);
  }, [messages, status, currentThreadId, isPendingNewThread]);

  const clearCurrentThread = () => {
    clearThread();
    clearMessages();
    clearImages();
  };

  const handleCreateNewThread = () => {
    createNewThread();
    clearMessages();
    clearImages();
  };

  const handleSwitchToThread = (threadId: string) => {
    const thread = switchToThread(threadId);
    if (thread) {
      updateMessages(thread.messages);
      clearImages();
      // Reset input to prevent carrying over text from previous thread
      setInput('');
    }
  };

  const handleDeleteThread = (threadId: string) => {
    const remainingThread = deleteThread(threadId);
    if (remainingThread) {
      updateMessages(remainingThread.messages);
    } else {
      clearMessages();
    }
    clearImages();
  };

  const sendMessage = async (userMessage: string) => {
    // Clear images immediately before sending to provide instant feedback
    const imagesToSend = [...selectedImages];
    clearImages();
    
    await sendApiMessage(
      userMessage,
      imagesToSend,
      messages,
      updateMessages,
      setStatus,
      setStreamingState
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImages.length > 0) && status !== 'streaming') {
      const messageToSend = input;
      setInput(''); // Clear input immediately
      sendMessage(messageToSend);
    }
  };

  // Set up keyboard shortcuts
  useKeyboardShortcuts(clearCurrentThread, handleCreateNewThread);

  return {
    // Input state
    input,
    setInput,
    model,
    setModel,
    
    // Messages state
    messages,
    status,
    streamingState,
    
    // Thread management
    currentThreadId,
    chatThreads,
    showThreadsList,
    setShowThreadsList,
    createNewThread: handleCreateNewThread,
    switchToThread: handleSwitchToThread,
    deleteThread: handleDeleteThread,
    clearCurrentThread,
    exportThreads,
    importThreads,
    getCurrentThread,
    
    // Image handling
    selectedImages,
    handleImageUpload,
    removeImage,
    clearImages,
    triggerImageUpload,
    formatFileSize,
    
    // Chat actions
    sendMessage,
    handleSubmit
  };
};
