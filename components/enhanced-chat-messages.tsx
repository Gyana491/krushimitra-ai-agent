import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/hooks/use-chat-messages';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Leaf, User, CloudSun, IndianRupee, BookOpenText, Database, Loader2, CheckCircle2, XCircle, Sparkles, CornerDownRight, ChevronDown, AlertCircle, Wrench } from "lucide-react";
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

// Accordion style tool calls container
function ToolCallDisplay({ toolCalls, finalizing }: { toolCalls: DisplayToolCall[]; finalizing?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Open the latest active (pending) tool call automatically
  useEffect(() => {
    const pending = toolCalls.find(t => t.status === 'pending');
    if (pending) {
      setOpenId(prev => (prev === pending.id ? prev : pending.id));
    } else if (finalizing) {
      // Close all when final response being assembled
      setOpenId(null);
    }
  }, [toolCalls, finalizing]);

  const completed = toolCalls.filter(t => t.status === 'completed').length;
  const percent = toolCalls.length > 0 ? Math.round((completed / toolCalls.length) * 100) : 0;

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mb-4 max-w-[90%] mr-auto space-y-2">
      <div className="px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <Loader2 className={"h-3 w-3 " + (percent === 100 ? 'hidden' : 'animate-spin')} />
            {percent === 100 ? 'Fetched all data sources' : 'Gathering data sources'}
          </p>
          <div className="mt-1 h-1 w-full bg-emerald-200/60 dark:bg-emerald-800 rounded overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <span className="text-[10px] w-10 text-right text-emerald-700 dark:text-emerald-400 font-medium">{percent}%</span>
      </div>
      <div className="rounded-md border border-emerald-200/60 dark:border-emerald-800 divide-y divide-emerald-200/50 dark:divide-emerald-800 bg-white dark:bg-gray-900/40 overflow-hidden">
        {toolCalls.map(toolCall => {
          const meta = TOOL_UI[toolCall.name] || { label: toolCall.name, description: 'Gathering info', icon: <Wrench className="h-4 w-4" /> };
          const isOpen = openId === toolCall.id;
          const statusIcon = toolCall.status === 'completed'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : toolCall.status === 'error'
              ? <XCircle className="h-4 w-4 text-red-600" />
              : <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
          return (
            <div key={toolCall.id}>
              <button
                type="button"
                onClick={() => setOpenId(prev => prev === toolCall.id ? null : toolCall.id)}
                className={"group w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-50/70 dark:hover:bg-emerald-800/30 transition-colors " + (isOpen ? 'bg-emerald-50/90 dark:bg-emerald-800/40' : '')}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="flex-shrink-0">{statusIcon}</span>
                  <div className="text-emerald-600 dark:text-emerald-400 flex-shrink-0">{meta.icon}</div>
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{meta.label}</span>
                  <span className={"text-[10px] uppercase tracking-wide ml-1 " + (toolCall.status === 'completed' ? 'text-green-600 dark:text-green-400' : toolCall.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>{toolCall.status}</span>
                  {toolCall.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500 ml-1" />}
                </div>
                <ChevronDown className={"h-4 w-4 text-emerald-600 transition-transform flex-shrink-0 " + (isOpen ? 'rotate-180' : '')} />
              </button>
              <div className={"px-3 pb-3 pt-1 text-[11px] space-y-2 " + (isOpen ? 'block' : 'hidden')}>                 
                <p className="text-gray-600 dark:text-gray-400 leading-snug">{meta.description}</p>
                <div className="grid gap-2">
                  <div className="rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-2">
                    <p className="text-[10px] font-semibold text-gray-500 mb-1">Request</p>
                    <pre className="text-[10px] leading-tight whitespace-pre-wrap break-words max-h-40 overflow-auto">{JSON.stringify(toolCall.args, null, 2)}</pre>
                  </div>
                  {toolCall.status === 'completed' && (
                    <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-2">
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 mb-1">Response</p>
                      <pre className="text-[10px] leading-tight whitespace-pre-wrap break-words max-h-52 overflow-auto">{toolCall.result ? JSON.stringify(toolCall.result, null, 2) : 'No result'}</pre>
                    </div>
                  )}
                  {toolCall.status === 'error' && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2">
                      <p className="text-[10px] font-semibold text-red-600 dark:text-red-300 mb-1">Error</p>
                      <p>Failed to fetch data. Continuing without this source.</p>
                    </div>
                  )}
                </div>
              </div>
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
  const prevIsLoadingRef = useRef<boolean>(false);
  const [persistedToolCalls, setPersistedToolCalls] = useState<DisplayToolCall[]>([]);

  // Capture last tool calls when streaming
  useEffect(() => {
    if (streamingState?.toolCalls && streamingState.toolCalls.length > 0) {
      setPersistedToolCalls(streamingState.toolCalls);
    }
  }, [streamingState?.toolCalls]);

  // After loading finishes, keep the accordion visible
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      // just finished loading, we already have persisted tool calls
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);
  
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
          {messages.map((message) => {
            // Build aggregated tool calls for assistant messages
            let aggregatedToolCalls: DisplayToolCall[] = [];
            if (message.role === 'assistant') {
              const toolCallParts = message.parts.filter(p => p.type === 'tool-call');
              const resultParts = message.parts.filter(p => p.type === 'tool-result');
              aggregatedToolCalls = toolCallParts.map((tc, index) => {
                const id = tc.toolCallId || `${message.id}-tool-${index}`;
                const matchingResult = resultParts.find(r => r.toolCallId && r.toolCallId === tc.toolCallId) || resultParts[index];
                return {
                  id,
                  name: tc.toolName || 'tool',
                  args: tc.toolArgs || {},
                  result: matchingResult?.toolResult,
                  status: matchingResult ? 'completed' as const : 'completed', // treat as completed when message stored
                };
              });
            }

            const filteredParts = message.parts.filter(p => p.type !== 'tool-call' && p.type !== 'tool-result');

            return (
              <div key={message.id} className="space-y-2">
                {aggregatedToolCalls.length > 0 && (
                  <div className="max-w-[85%] sm:max-w-[80%] mr-auto">
                    <ToolCallDisplay toolCalls={aggregatedToolCalls} finalizing />
                  </div>
                )}
                <div
                  className={cn(
                    "flex gap-2",
                    "max-w-[85%] sm:max-w-[80%]",
                    message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                    "break-words overflow-hidden"
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
                      {filteredParts.map((part, i) => {
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
              </div>
            );
          })}
        </>
      )}

      {/* Show streaming state */}
  {isLoading && streamingState && (
        <>
          <ToolCallDisplay toolCalls={streamingState.toolCalls} finalizing={!!streamingState.finalResponse} />
          {streamingState.finalResponse && (
            <div className="flex gap-2 max-w-[85%] mr-auto">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="p-3 bg-card border border-emerald-200/70">
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {streamingState.finalResponse}
                </p>
              </Card>
            </div>
          )}
          {!streamingState.finalResponse && <FarmingLoadingIndicator step={streamingState.currentStep} />}
        </>
      )}
      
      {isLoading && !streamingState && <FarmingLoadingIndicator />}

      {/* Persisted tool calls after completion (shown only when not loading) */}
      {!isLoading && !streamingState && persistedToolCalls.length > 0 && (
        <ToolCallDisplay toolCalls={persistedToolCalls} finalizing />
      )}

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
