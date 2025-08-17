import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from './use-chat-messages';
import { chatDB } from '../lib/chat-db';

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

  // Load suggested queries from IndexedDB
  useEffect(() => {
    const loadSuggestedQueries = async () => {
      try {
        // First try to migrate from localStorage if it exists
        await chatDB.migrateSuggestedQueriesFromLocalStorage();
        
        // Then load from IndexedDB
        const savedQueries = await chatDB.getSuggestedQueries();
        if (savedQueries && Array.isArray(savedQueries.queries)) {
          setState(prev => ({ 
            ...prev, 
            queries: savedQueries.queries, 
            lastUpdated: savedQueries.lastUpdated || null 
          }));
          lastContextHash.current = savedQueries.contextHash || null;
        }
      } catch (e) {
        console.warn('Failed to load suggested queries:', e);
      }
    };

    loadSuggestedQueries();
  }, []);

  // Save suggested queries to IndexedDB
  const saveToIndexedDB = useCallback(async (queries: string[], contextHash: string) => {
    try {
      await chatDB.saveSuggestedQueries(queries, contextHash);
    } catch (error) {
      console.error('Failed to save suggested queries to IndexedDB:', error);
    }
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

    // Log for debugging
    console.log('Suggested Query Generation Check:', {
      threadId,
      forceGeneration: force,
      messagesCount: messages.length,
      contextUnchanged,
      tooSoon,
      notEnough,
      isGenerating: isGenerating.current
    });

    if (!force) {
      if (contextUnchanged) {
        console.log('Context unchanged, skipping query generation');
        return;
      }
      if (tooSoon) {
        console.log('Too soon since last API call, skipping query generation');
        return;
      }
      if (isGenerating.current) {
        console.log('Already generating, skipping query generation');
        return;
      }
      if (notEnough) {
        console.log('Not enough messages for context, skipping query generation');
        return;
      }
    } else if (isGenerating.current) {
      console.log('Force requested but already generating, skipping query generation');
      return; // even force won't run concurrently
    }

    console.log('Starting query generation for thread:', threadId);

    isGenerating.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
      lastApiCall.current = now;
  console.log('Generating suggested queries (global cache)');
  lastContextHash.current = contextHash;

      // Attach location context from selected location storage
      let locationContext: any = undefined;
      try {
        const locRaw = localStorage.getItem('cropwise-selected-location');
        if (locRaw) {
          const loc = JSON.parse(locRaw);
          if (loc) {
            locationContext = {
              address: loc.address || [loc.cityName, loc.stateName].filter(Boolean).join(', '),
              cityName: loc.cityName,
              stateName: loc.stateName,
              areaSizeAcres: loc.areaSizeAcres || (typeof loc.areaSize === 'number' ? `${(loc.areaSize * 0.000247105).toFixed(2)} acres` : undefined),
              // Extended metadata
              locationAddress: loc.address || [loc.cityName, loc.stateName].filter(Boolean).join(', '),
              latitude: loc.lat,
              longitude: loc.lng,
              areaSizeSqMeters: loc.areaSize
            };
          }
        }
      } catch {}

      const response = await fetch('/api/suggested-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          ...(locationContext ? { locationContext } : {})
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
        saveToIndexedDB(newQueries, contextHash);
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
        saveToIndexedDB(fallback.slice(0,4), contextHash);
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
  }, [saveToIndexedDB, MIN_INTERVAL_MS]);

  const generateSuggestedQueries = useCallback((messages: ChatMessage[], threadId: string) => coreGenerate(messages, threadId, false), [coreGenerate]);
  const forceGenerateSuggestedQueries = useCallback((messages: ChatMessage[], threadId: string) => {
    console.log('Force generating queries for thread:', threadId);
    
    // Reset the generation state to allow force-regeneration even if something was in progress
    isGenerating.current = false;
    lastApiCall.current = 0;
    
    // Add some delay to ensure we don't clash with other operations
    setTimeout(() => {
      // Double check there are messages to work with
      if (messages && messages.length > 0) {
        coreGenerate(messages, threadId, true);
      } else {
        console.warn('Cannot generate suggestions: No messages available');
      }
    }, 300);
  }, [coreGenerate]);

  // Clear suggested queries for current thread
  const clearSuggestedQueries = useCallback(async (_threadId?: string) => {
    setState(prev => ({
      ...prev,
      queries: [],
      error: null,
      lastUpdated: null,
    }));
    try {
      await chatDB.clearSuggestedQueries();
    } catch (error) {
      console.error('Failed to clear suggested queries from IndexedDB:', error);
    }
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
