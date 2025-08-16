import React from 'react';
import { ChatThread } from '@/hooks/use-chat-threads';

interface ThreadsSidebarProps {
  showThreadsList: boolean;
  setShowThreadsList: (show: boolean) => void;
  chatThreads: ChatThread[];
  currentThreadId: string;
  switchToThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  createNewThread: () => void;
  exportThreads: () => void;
  importThreads: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ThreadsSidebar: React.FC<ThreadsSidebarProps> = ({
  showThreadsList,
  setShowThreadsList,
  chatThreads,
  currentThreadId,
  switchToThread,
  deleteThread,
  createNewThread,
  exportThreads,
  importThreads
}) => {
  if (!showThreadsList) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="bg-white dark:bg-gray-900 w-80 h-full shadow-lg overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat Threads</h2>
            <button
              onClick={() => setShowThreadsList(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {chatThreads.length} conversation{chatThreads.length !== 1 ? 's' : ''}
          </p>
          
          {/* Export/Import Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={exportThreads}
              className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
              title="Export all threads"
            >
              📤 Export
            </button>
            <label className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors cursor-pointer">
              📥 Import
              <input
                type="file"
                accept=".json"
                onChange={importThreads}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div className="p-4 space-y-2">
          {chatThreads.map((thread) => (
            <div
              key={thread.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                thread.id === currentThreadId
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => switchToThread(thread.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{thread.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(thread.updatedAt).toLocaleDateString()} {new Date(thread.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThread(thread.id);
                  }}
                  className="text-red-400 hover:text-red-600 ml-2 p-1"
                  title="Delete thread"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          
          {chatThreads.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p>No chat threads yet</p>
              <button
                onClick={createNewThread}
                className="mt-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
              >
                Start your first chat
              </button>
            </div>
          )}
        </div>
      </div>
      <div 
        className="flex-1"
        onClick={() => setShowThreadsList(false)}
      ></div>
    </div>
  );
};
