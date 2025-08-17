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

  // Simple initialization: load messages if we have a thread ID
  useEffect(() => {
    if (currentThreadId) {
      const currentThread = getCurrentThread();
      if (currentThread) {
        updateMessages(currentThread.messages);
      }
    }
  }, [currentThreadId, getCurrentThread, updateMessages]);

  // Update thread storage whenever messages change
  useEffect(() => {
    if (currentThreadId) {
      if (messages.length > 0) {
        // Only update if we have both messages and a current thread
        updateCurrentThread(messages);
      } else {
        // If we have no messages but a thread ID, don't store the empty thread
        // We'll keep the thread ID in memory but won't persist it until it has messages
        console.log('Not storing empty chat thread');
      }
    }
  }, [messages, updateCurrentThread, currentThreadId]);

  // Console logging
  useEffect(() => {
    console.log('Status:', status);
    console.log('Messages:', messages);
    console.log('Total messages in thread:', messages.length);
    console.log('Current thread ID:', currentThreadId);
    console.log('Is pending new thread:', isPendingNewThread);
    console.log('Total threads:', chatThreads.length);
    console.log('Threads with messages:', chatThreads.filter(t => t.messages && t.messages.length > 0).length);
  }, [messages, status, currentThreadId, isPendingNewThread, chatThreads]);

  // Simple clear function
  const clearCurrentThread = () => {
    clearThread();
    clearMessages();
    clearImages();
  };

  // Create new thread and reset state
  const handleCreateNewThread = () => {
    clearMessages();
    clearImages();
    setInput('');
    createNewThread();
  };

  // Simple switch thread function
  const handleSwitchToThread = (threadId: string) => {
    const thread = switchToThread(threadId);
    if (thread) {
      clearImages();
      setInput('');
      updateMessages(thread.messages);
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
    
    // Create a new thread if we don't have one, but it won't be stored until messages exist
    if (!currentThreadId) {
      createNewThread();
    }
    
    // Only empty threads don't get persisted, but once we have a message, it will be saved
    if (userMessage.trim() || imagesToSend.length > 0) {
      // Send the message
      await sendApiMessage(
        userMessage,
        imagesToSend,
        messages,
        updateMessages,
        setStatus,
        setStreamingState
      );
    }
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
