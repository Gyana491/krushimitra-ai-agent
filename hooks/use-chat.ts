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
    switchToThread,
    deleteThread,
    updateCurrentThread,
    clearCurrentThread: clearThread,
    exportThreads,
    importThreads,
    getCurrentThread
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
    } else {
      // Create initial thread if none exists
      if (chatThreads.length === 0) {
        createNewThread();
      }
    }
  }, [currentThreadId, getCurrentThread, updateMessages, createNewThread, chatThreads.length]);

  // Update current thread when messages change
  useEffect(() => {
    updateCurrentThread(messages);
  }, [messages, updateCurrentThread]);

  // Console logging
  useEffect(() => {
    console.log('Status:', status);
    console.log('Messages:', messages);
    console.log('Total messages in thread:', messages.length);
    console.log('Current thread ID:', currentThreadId);
  }, [messages, status, currentThreadId]);

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
    await sendApiMessage(
      userMessage,
      selectedImages,
      messages,
      updateMessages,
      setStatus,
      setStreamingState
    );
    // Clear images after sending
    clearImages();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImages.length > 0) && status !== 'streaming') {
      sendMessage(input);
      setInput('');
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
