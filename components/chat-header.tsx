import React from 'react';
import { ChatThread } from '@/hooks/use-chat-threads';
import { ChatMessage } from '@/hooks/use-chat-messages';

interface ChatHeaderProps {
  messages: ChatMessage[];
  status: 'idle' | 'submitted' | 'streaming' | 'error';
  chatThreads: ChatThread[];
  createNewThread: () => void;
  setShowThreadsList: (show: boolean) => void;
  clearCurrentThread: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  messages,
  status,
  chatThreads,
  createNewThread,
  setShowThreadsList,
  clearCurrentThread
}) => {
  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold">Farm Assistant Chat</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {messages.length === 0 
                ? 'Start a conversation...' 
                : `${messages.length} messages in conversation`
              }
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createNewThread}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
              title="New chat (Ctrl+N)"
            >
              + New Chat
            </button>
            <button
              onClick={() => setShowThreadsList(true)}
              className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/40 transition-colors"
            >
              📋 Threads ({chatThreads.length})
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearCurrentThread}
              className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
              title="Clear current thread (Ctrl+K)"
            >
              Clear Thread
            </button>
          )}
          <div className={`px-2 py-1 text-xs rounded ${
            status === 'idle' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
            status === 'streaming' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
            status === 'submitted' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
            'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {status === 'idle' ? 'Ready' :
             status === 'streaming' ? 'Processing...' :
             status === 'submitted' ? 'Connecting...' :
             'Error'}
          </div>
        </div>
      </div>
    </div>
  );
};
