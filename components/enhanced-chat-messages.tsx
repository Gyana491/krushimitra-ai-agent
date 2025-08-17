import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/use-chat-messages';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Leaf, User, CloudSun, IndianRupee, BookOpenText, Database, Loader2, CheckCircle2, XCircle, Sparkles, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useTranslation } from "@/hooks/use-translation";

interface DisplayToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string | number | boolean | unknown[] | Record<string, unknown> | null | undefined;
  status: 'pending' | 'completed' | 'error';
}

interface EnhancedChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingState?: {
    currentStep: string;
    toolCalls: DisplayToolCall[];
    reasoning: string[];
    finalResponse: string;
  };
  suggestedQueries?: string[]; // current suggestions to show inline after last assistant message
  onSuggestedQueryClick?: (q: string) => void;
}

function FarmingLoadingIndicator({ step }: { step?: string }) {
  return (
    <div className="flex gap-2 max-w-[85%] mr-auto">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-secondary text-secondary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 items-start">
        <Card className="p-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-6 h-6 relative">
                <div className="absolute bottom-0 w-6 h-2 bg-amber-600 rounded-full opacity-60"></div>
                <div
                  className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-0.5 bg-green-500 animate-pulse origin-bottom"
                  style={{
                    height: "12px",
                    animation: "grow 1.5s ease-in-out infinite alternate",
                  }}
                ></div>
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                  <Leaf
                    className="h-3 w-3 text-green-400 animate-bounce"
                    style={{ animationDelay: "0.3s", animationDuration: "2s" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0s", animationDuration: "1.4s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s", animationDuration: "1.4s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s", animationDuration: "1.4s" }}
              ></div>
            </div>

            <span className="text-sm text-muted-foreground animate-pulse">
              {step || "Analyzing..."}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

const TOOL_UI: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  'weather-tool': { label: 'Checking Weather', description: 'Getting local weather for better advice', icon: <CloudSun className="h-4 w-4" /> },
  'mandi-price-tool': { label: 'Market Prices', description: 'Fetching latest mandi / market rates', icon: <IndianRupee className="h-4 w-4" /> },
  'research-tool': { label: 'Background Info', description: 'Looking up reliable farming info', icon: <BookOpenText className="h-4 w-4" /> },
  'kcc-database-tool': { label: 'Knowledge Base', description: 'Searching stored farming knowledge', icon: <Database className="h-4 w-4" /> },
};

function ToolCallDisplay({ toolCalls }: { toolCalls: DisplayToolCall[] }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  const completed = toolCalls.filter(t => t.status === 'completed').length;
  const percent = Math.round((completed / toolCalls.length) * 100);

  return (
    <div className="mb-4 max-w-[90%] mr-auto space-y-3">
      <div className="px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Preparing your answer...</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{percent}%</span>
        </div>
        <div className="h-1 w-full bg-emerald-200/60 dark:bg-emerald-800 rounded overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="space-y-2">
        {toolCalls.map((toolCall, idx) => {
          const meta = TOOL_UI[toolCall.name] || { label: toolCall.name, description: 'Gathering info', icon: <Loader2 className="h-4 w-4 animate-spin" /> };
          const statusIcon = toolCall.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : toolCall.status === 'error' ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
          );
          return (
            <div key={toolCall.id} className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border bg-white dark:bg-gray-900 ${toolCall.status === 'completed' ? 'border-green-500' : toolCall.status === 'error' ? 'border-red-500' : 'border-amber-400 animate-pulse'}`}>{statusIcon}</div>
                {idx < toolCalls.length - 1 && <div className="flex-1 w-px bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-700" />}
              </div>
              <Card className="flex-1 p-2.5 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="text-emerald-600 dark:text-emerald-400">{meta.icon}</div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{meta.label}</p>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">{toolCall.status}</span>
                </div>
                <p className="text-[11px] mt-0.5 text-gray-600 dark:text-gray-400 leading-snug">{meta.description}</p>
                {toolCall.status === 'error' && (
                  <p className="text-[11px] text-red-600 mt-1">Could not fetch this info. Will continue.</p>
                )}
                {toolCall.status === 'completed' && toolCall.result && typeof toolCall.result === 'object' && (
                  <details className="mt-1 group">
                    <summary className="cursor-pointer text-[10px] text-emerald-600 dark:text-emerald-400 underline decoration-dotted">Details</summary>
                    <pre className="mt-1 max-h-40 overflow-auto bg-gray-50 dark:bg-gray-900 p-2 rounded text-[10px] leading-tight whitespace-pre-wrap">{String(JSON.stringify(toolCall.result, null, 2))}</pre>
                  </details>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EnhancedChatMessages({ 
  messages, 
  isLoading, 
  streamingState,
  suggestedQueries = [],
  onSuggestedQueryClick
}: EnhancedChatMessagesProps) {
  const { t } = useTranslation()
  
  const formatTime = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit" });
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom function with smooth behavior and gap
  const scrollToBottom = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      // Scroll to bottom with some gap (80px from bottom)
      const targetScrollTop = scrollHeight - clientHeight - 80;
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll during streaming/loading
  useEffect(() => {
    if (isLoading || streamingState?.finalResponse) {
      scrollToBottom();
    }
  }, [isLoading, streamingState?.finalResponse, streamingState?.currentStep]);

  // Auto-scroll when streaming response updates
  useEffect(() => {
    if (streamingState?.finalResponse) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [streamingState?.finalResponse]);

  // Initial scroll to bottom on mount if there are existing messages
  useEffect(() => {
    if (messages.length > 0) {
      // Use smooth scroll on mount with delay
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length]); // Include messages.length as a dependency
  
  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
      {messages.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">🌾</div>
            <h2 className="text-xl font-semibold mb-2">{t('welcomeTitle')}</h2>
            <p className="text-sm mb-4">
              {t('welcomeDescription')}
            </p>
            
            <div className="mt-4 space-y-2 text-xs">
              <p>{t('tryAsking')}:</p>
              <div className="space-y-1">
                <p>&quot;{t('exampleWeather')}&quot;</p>
                <p>&quot;{t('examplePrice')}&quot;</p>
                <p>&quot;{t('exampleFarming')}&quot;</p>
                <p>&quot;{t('exampleImage')}&quot;</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                "max-w-[85%] sm:max-w-[80%]",
                message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-xs",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              <div className={cn("flex flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}>
                <Card
                  className={cn(
                    "p-3",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {/* Render message parts */}
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <div key={i} className="prose text-sm leading-snug">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        );
                      
                      case 'image':
                        return (
                          <div key={i} className="mb-2">
                            <Image
                              src={`data:${part.imageType};base64,${part.imageData}`}
                              alt={part.imageName || 'Uploaded image'}
                              width={256}
                              height={256}
                              className="rounded-md max-w-full h-auto max-h-64 object-cover"
                            />
                            {part.imageName && (
                              <p className="text-xs text-gray-500 mt-1">{part.imageName}</p>
                            )}
                          </div>
                        );
                      
                      case 'tool-call':
                        return (
                          <div key={i} className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                              🔧 Tool: {part.toolName}
                            </div>
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
                                View Arguments
                              </summary>
                              <pre className="mt-1 p-1 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                {JSON.stringify(part.toolArgs, null, 2)}
                              </pre>
                            </details>
                          </div>
                        );
                      
                      case 'tool-result':
                        return (
                          <div key={i} className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                              ✅ Result
                            </div>
                            <details className="text-xs">
                              <summary className="cursor-pointer text-green-600 dark:text-green-400">
                                View Result
                              </summary>
                              <pre className="mt-1 p-1 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                {JSON.stringify(part.toolResult, null, 2)}
                              </pre>
                            </details>
                          </div>
                        );
                      
                      case 'suggested-queries':
                        if (!part.queries || part.queries.length === 0) return null;
                        return (
                          <div key={i} className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-emerald-600 font-medium">
                              <Sparkles className="h-3 w-3" /> {t('suggestedFollowUps')}
                            </div>
                            <div className="flex flex-col gap-1">
                              {part.queries.map((q, qi) => (
                                <button
                                  key={qi}
                                  onClick={() => onSuggestedQueryClick?.(q)}
                                  className="group flex items-start gap-2 text-left p-2 rounded-md border border-emerald-300 hover:border-emerald-400 bg-emerald-50/60 hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  <CornerDownRight className="h-4 w-4 text-emerald-500 mt-0.5" />
                                  <span className="text-[13px] text-emerald-800 group-hover:text-emerald-900 leading-snug flex-1">{q}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white group-hover:bg-emerald-700 ml-1">
                                    {t('askButton')}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </Card>

                <span className="text-xs text-muted-foreground px-1">
                  {formatTime(new Date())}
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Show streaming state */}
  {isLoading && streamingState && (
        <>
          <ToolCallDisplay toolCalls={streamingState.toolCalls} />
          
          {streamingState.finalResponse && (
            <div className="flex gap-2 max-w-[85%] mr-auto">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="p-3 bg-card">
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {streamingState.finalResponse}
                </p>
              </Card>
            </div>
          )}
          
          <FarmingLoadingIndicator step={streamingState.currentStep} />
        </>
      )}
      
      {isLoading && !streamingState && <FarmingLoadingIndicator />}

      {/* Inline suggested queries after last assistant reply if not loading */}
      {!isLoading && suggestedQueries.length > 0 && (() => {
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        if (!lastAssistant) return null;
        return (
          <div className="flex gap-2 max-w-[85%] mr-auto">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-3 bg-card border-emerald-200/70">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-emerald-700"><Sparkles className="h-4 w-4" /> {t('suggestedFollowUps')}</div>
              <div className="space-y-1">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestedQueryClick?.(q)}
                    className="group w-full text-left text-[13px] px-2 py-1 rounded-md border border-emerald-300 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 flex items-start gap-2 transition-colors cursor-pointer"
                  >
                    <CornerDownRight className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span className="flex-1 leading-snug text-emerald-800 group-hover:text-emerald-900">{q}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white group-hover:bg-emerald-700">{t('askButton')}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        );
      })()}
      
      {/* Invisible element to scroll to */}
      <div ref={endOfMessagesRef} className="h-1" />
    </div>
  );
}
