"use client"

import React from "react"
import { MessageSquare, Plus, Trash2, Calendar, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "./language-selector"
// Removed ScrollArea in favor of simple overflow container for precise control
import { formatDistanceToNow } from "date-fns"

interface ChatThread {
  id: string
  title: string
  messages: {
    role: string;
    content: string | { type: string; [key: string]: unknown }[];
    id?: string;
  }[]
  createdAt: Date
  updatedAt: Date
}

interface ConversationSidebarProps {
  isOpen: boolean
  threads: ChatThread[]
  currentThreadId: string | null
  onThreadSelect: (threadId: string) => void
  onNewChat: () => void
  onDeleteThread: (threadId: string) => void
  onClose: () => void
  onProfileClick?: () => void
  userName?: string
}

export function ConversationSidebar({
  isOpen,
  threads,
  currentThreadId,
  onThreadSelect,
  onNewChat,
  onDeleteThread,
  onClose,
  onProfileClick,
  userName = "Farmer"
}: ConversationSidebarProps) {
  // Helper function to truncate thread title
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title
    return title.slice(0, maxLength) + "..."
  }

  // Group threads by date
  const groupThreadsByDate = (threads: ChatThread[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const groups: { [key: string]: ChatThread[] } = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: []
    }

    threads.forEach(thread => {
      const threadDate = new Date(thread.updatedAt)
      threadDate.setHours(0, 0, 0, 0)

      if (threadDate.getTime() === today.getTime()) {
        groups.Today.push(thread)
      } else if (threadDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(thread)
      } else if (threadDate >= thisWeek) {
        groups["This Week"].push(thread)
      } else {
        groups.Older.push(thread)
      }
    })

    return groups
  }

  const threadGroups = groupThreadsByDate(threads)

  const content = (
    <>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          {/* Close button only on mobile overlay */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* User info and actions */}
        <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium truncate max-w-[9rem]">{userName}</span>
            </div>
            <div className="flex space-x-2">
              {onProfileClick && (
                <Button
                  onClick={() => {
                    onProfileClick()
                    onClose()
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              )}
              <div className="flex-1">
                <LanguageSelector variant="sidebar" />
              </div>
            </div>
            <Button
              onClick={onNewChat}
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
        </div>
      </div>
      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-6">
          {Object.entries(threadGroups).map(([groupName, groupThreads]) => {
            if (groupThreads.length === 0) return null
            return (
              <div key={groupName}>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {groupName}
                </h3>
                <div className="space-y-1">
                  {groupThreads.map((thread) => (
                    <div key={thread.id} className="group relative">
                      <button
                        onClick={() => {
                          onThreadSelect(thread.id)
                          onClose()
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentThreadId === thread.id
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-left">
                              {truncateTitle(thread.title)}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {thread.messages.length} messages
                            </p>
                          </div>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteThread(thread.id)
                        }}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {threads.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col">
            {content}
          </div>
        </div>
      )}
      {/* Desktop persistent sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-80 bg-white border-r shadow-sm flex-col">
        {content}
      </div>
    </>
  )
}
