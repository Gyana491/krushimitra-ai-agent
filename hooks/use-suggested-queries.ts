import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from './use-chat-messages';

interface SuggestedQueriesState {
  queries: string[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export const useSuggestedQueries = (currentThreadId: string) => {
  const [state, setState] = useState<SuggestedQueriesState>({
    queries: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  // Rate limiting - prevent too many API calls
  const lastApiCall = useRef<number>(0);
  const isGenerating = useRef<boolean>(false);
  const MIN_INTERVAL_MS = 8000; // shorter gap; we'll still only call once per assistant turn
  const lastContextHash = useRef<string | null>(null);

  const computeContextHash = (messages: ChatMessage[]): string => {
    const slice = messages.slice(-8); // last 8 messages
    const base = slice.map(m => `${m.role}:${m.content}`).join('|');
    let hash = 0;
    for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
    return hash.toString(16);
  };

  // Load suggested queries from unified localStorage key
  useEffect(() => {
    try {
      const raw = localStorage.getItem('suggested-queries');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.queries)) {
          setState(prev => ({ ...prev, queries: parsed.queries, lastUpdated: parsed.lastUpdated || null }));
          lastContextHash.current = parsed.contextHash || null;
        }
      }
    } catch (e) {
      console.warn('Failed to load suggested queries:', e);
    }
  }, []);

  // Save suggested queries to single localStorage key
  const saveToLocalStorage = useCallback((queries: string[], contextHash: string) => {
    const data = {
      queries,
      lastUpdated: new Date().toISOString(),
      contextHash
    };
    localStorage.setItem('suggested-queries', JSON.stringify(data));
  }, []);

  // Generate suggested queries based on conversation messages
  const coreGenerate = useCallback(async (messages: ChatMessage[], threadId: string, force = false) => {
    if (!messages || messages.length === 0) {
      setState(prev => ({ ...prev, queries: [], error: null }));
      return;
    }

    const now = Date.now();
    const contextHash = computeContextHash(messages);
    const contextUnchanged = lastContextHash.current === contextHash;
    const tooSoon = now - lastApiCall.current < MIN_INTERVAL_MS;
    const notEnough = messages.filter(m => m.role === 'assistant').length === 0;

    if (!force) {
      if (contextUnchanged) return; // nothing new
      if (tooSoon) return;
      if (isGenerating.current) return;
      if (notEnough) return;
    } else if (isGenerating.current) {
      return; // even force won't run concurrently
    }

    isGenerating.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
      lastApiCall.current = now;
  console.log('Generating suggested queries (global cache)');
  lastContextHash.current = contextHash;

      const response = await fetch('/api/suggested-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait before generating new suggestions.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.suggestedQueries)) {
        let newQueries: string[] = data.suggestedQueries.filter((q: any) => typeof q === 'string' && q.trim()).slice(0,4);
        if (newQueries.length === 0) {
          // Build client heuristic rather than throwing
          const lastUser = [...messages].reverse().find(m => m.role === 'user');
          const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
          const source = (lastAssistant?.content || '') + ' ' + (lastUser?.content || '');
          const lower = String(source).toLowerCase();
          const heuristic: string[] = [];
          if (lower.includes('onion') || lower.includes('प्याज')) {
            heuristic.push('Onion fungal disease prevention now?');
            heuristic.push('How to improve onion drainage quickly?');
          }
            if (lower.includes('weather') || lower.includes('मौसम')) heuristic.push('What to prepare first for the coming weather?');
          if (!heuristic.length) heuristic.push('What should I ask next for better advice?');
          newQueries = heuristic.slice(0,4);
        }
        setState(prev => ({
          ...prev,
          queries: newQueries,
          isLoading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
        }));
        saveToLocalStorage(newQueries, contextHash);
      } else {
        throw new Error(data.error || 'Malformed suggestions response');
      }
    } catch (error) {
      console.error('Error generating suggested queries:', error);
      // Client-side heuristic fallback if API fails
      try {
        const lastUser = [...messages].reverse().find(m => m.role === 'user');
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        const source = (lastAssistant?.content || '') + ' ' + (lastUser?.content || '');
        const lower = String(source).toLowerCase();
        const fallback: string[] = [];
        if (lower.includes('प्याज') || lower.includes('onion')) {
          fallback.push('प्याज में अभी कौन सा रोग जोखिम पर है?');
          fallback.push('बारिश के बाद प्याज खेत में क्या निरीक्षण करूँ?');
        }
        if (lower.includes('मौसम') || lower.includes('weather')) {
          fallback.push('अगले 3 दिनों के मौसम के अनुसार क्या तैयारी करें?');
        }
        if (!fallback.length) {
          fallback.push('फसल देखभाल का अगला कदम क्या हो सकता है?');
          fallback.push('मौजूदा परिस्थितियों में जोखिम कैसे कम करूँ?');
        }
        setState(prev => ({
          ...prev,
          queries: fallback.slice(0,4),
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          lastUpdated: new Date().toISOString(),
        }));
        saveToLocalStorage(fallback.slice(0,4), contextHash);
      } catch {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
      }
    } finally {
      isGenerating.current = false;
    }
  }, [saveToLocalStorage, MIN_INTERVAL_MS]);

  const generateSuggestedQueries = useCallback((messages: ChatMessage[], threadId: string) => coreGenerate(messages, threadId, false), [coreGenerate]);
  const forceGenerateSuggestedQueries = useCallback((messages: ChatMessage[], threadId: string) => coreGenerate(messages, threadId, true), [coreGenerate]);

  // Clear suggested queries for current thread
  const clearSuggestedQueries = useCallback((_threadId?: string) => {
    setState(prev => ({
      ...prev,
      queries: [],
      error: null,
      lastUpdated: null,
    }));
    localStorage.removeItem('suggested-queries');
    lastContextHash.current = null;
  }, []);

  // Refresh suggested queries
  const refreshSuggestedQueries = useCallback(async (messages: ChatMessage[], threadId: string) => {
    await generateSuggestedQueries(messages, threadId);
  }, [generateSuggestedQueries]);

  // Check if queries should be regenerated (based on time or message count)
  const shouldRegenerateQueries = useCallback((messages: ChatMessage[], lastUpdated: string | null): boolean => {
    if (!lastUpdated) return true;
    
    // Don't regenerate if we just made an API call recently
    const now = Date.now();
    if (now - lastApiCall.current < MIN_INTERVAL_MS) {
      return false;
    }
    
    // Only regenerate if last update was more than 10 minutes ago
    // This makes it less aggressive since we're now only calling after agent responses
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const tenMinutesAgo = now - (10 * 60 * 1000);
    
    if (lastUpdateTime < tenMinutesAgo) return true;
    
    // Don't regenerate too frequently
    return false;
  }, [MIN_INTERVAL_MS]);

  return {
    suggestedQueries: state.queries,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
  generateSuggestedQueries,
  forceGenerateSuggestedQueries,
    clearSuggestedQueries,
    refreshSuggestedQueries,
    shouldRegenerateQueries,
  };
};
