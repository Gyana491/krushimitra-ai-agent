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

  // Simple concurrency guard
  const isGenerating = useRef<boolean>(false);
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
        await chatDB.migrateSuggestedQueriesFromLocalStorage();
        const id = currentThreadId || 'global';
        const savedQueries = await chatDB.getSuggestedQueries(id);
        if (savedQueries && Array.isArray(savedQueries.queries)) {
          setState(prev => ({
            ...prev,
            queries: savedQueries.queries,
            lastUpdated: savedQueries.lastUpdated || null
          }));
          lastContextHash.current = savedQueries.contextHash || null;
        } else if (!currentThreadId) {
          // fallback: try onboarding id
          const onboarding = await chatDB.getSuggestedQueries('onboarding');
          if (onboarding?.queries?.length) {
            setState(prev => ({ ...prev, queries: onboarding.queries, lastUpdated: onboarding.lastUpdated || null }));
            lastContextHash.current = onboarding.contextHash || null;
          }
        }
      } catch (e) {
        console.warn('Failed to load suggested queries:', e);
      }
    };
    loadSuggestedQueries();
  }, [currentThreadId]);

  // Save suggested queries to IndexedDB
  const saveToIndexedDB = useCallback(async (queries: string[], contextHash: string) => {
    try {
      const id = currentThreadId || 'global';
      await chatDB.saveSuggestedQueries(queries, contextHash, id);
      
      // ALWAYS update global queries for homepage rendering
      if (id !== 'global') {
        console.log('Updating global suggested queries for homepage');
        await chatDB.saveSuggestedQueries(queries, contextHash, 'global');
      }
    } catch (error) {
      console.error('Failed to save suggested queries to IndexedDB:', error);
    }
  }, [currentThreadId]);

  // Generate suggested queries based on conversation messages
  const coreGenerate = useCallback(async (messages: ChatMessage[], threadId: string, force = false) => {
    if (!messages || messages.length === 0) {
      setState(prev => ({ ...prev, queries: [], error: null }));
      return;
    }

    const contextHash = computeContextHash(messages);
  const notEnough = messages.filter(m => m.role === 'assistant').length === 0;

    // Log for debugging
    console.log('Suggested Query Generation Check:', {
      threadId,
      forceGeneration: force,
      messagesCount: messages.length,
      notEnough,
      isGenerating: isGenerating.current
    });

    if (isGenerating.current) {
      console.log('Already generating, skipping');
      return;
    }
    if (notEnough) {
      console.log('No assistant message yet, skipping suggestions');
      return;
    }

    console.log('Starting query generation for thread:', threadId);

    isGenerating.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
      console.log('Generating suggested queries (immediate)');
      lastContextHash.current = contextHash;

      // Attach location context from selected location storage
      let locationContext: any = undefined;
      let userProfile: any = undefined;
      
      try {
        // Get user profile data
        const userRaw = localStorage.getItem('cropwise-user-data');
        if (userRaw) {
          userProfile = JSON.parse(userRaw);
        }
        
        // Get location data
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

      // Get only the last user message and last assistant message
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      
      // Only send the essential context - last conversation pair
      const contextMessages = [lastUser, lastAssistant].filter((msg): msg is NonNullable<typeof msg> => msg !== undefined);
      
      console.log('Sending API request to /api/suggested-queries with payload:', {
        messagesCount: contextMessages.length,
        lastUserContent: lastUser?.content?.slice(0, 100),
        lastAssistantContent: lastAssistant?.content?.slice(0, 100),
        hasUserProfile: !!userProfile,
        userLanguage: userProfile?.language,
        locationContext
      });

      const requestBody: any = {
        messages: contextMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        userProfile,
        ...(locationContext ? { locationContext } : {})
      };

      const response = await fetch('/api/suggested-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait before generating new suggestions.');
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);

      if (data.success && Array.isArray(data.suggestedQueries)) {
        let newQueries: string[] = data.suggestedQueries.filter((q: any) => typeof q === 'string' && q.trim()).slice(0,4);
        console.log('Filtered queries from API:', newQueries);
        if (newQueries.length === 0) {
          console.warn('No valid queries from API, using heuristic fallback');
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
        console.log('Final queries being set:', newQueries);
        setState(prev => ({
          ...prev,
          queries: newQueries,
          isLoading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
        }));
        saveToIndexedDB(newQueries, contextHash);
        console.log('Suggestions saved to state and IndexedDB successfully');
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
  }, [saveToIndexedDB]);

  const generateSuggestedQueries = useCallback((messages: ChatMessage[], threadId: string, force = false) => coreGenerate(messages, threadId, force), [coreGenerate]);
  // Force helper always bypasses context hash logic (already removed) but clarifies intent
  const generateNow = useCallback((messages: ChatMessage[], threadId: string) => coreGenerate(messages, threadId, true), [coreGenerate]);

  // Clear suggested queries for current thread
  const clearSuggestedQueries = useCallback(async (_threadId?: string) => {
    setState(prev => ({
      ...prev,
      queries: [],
      error: null,
      lastUpdated: null,
    }));
    try {
      await chatDB.clearSuggestedQueries(currentThreadId || undefined);
    } catch (error) {
      console.error('Failed to clear suggested queries from IndexedDB:', error);
    }
    lastContextHash.current = null;
  }, [currentThreadId]);

  // Refresh suggested queries
  const refreshSuggestedQueries = useCallback(async (messages: ChatMessage[], threadId: string) => {
    await generateSuggestedQueries(messages, threadId);
  }, [generateSuggestedQueries]);

  // Check if queries should be regenerated (based on time or message count)
  const shouldRegenerateQueries = useCallback((_messages: ChatMessage[], _lastUpdated: string | null): boolean => {
    // With immediate generation strategy we can just always regenerate when called externally
    return true;
  }, []);

  // Generate initial suggested queries after onboarding completion
  const generateOnboardingQueries = useCallback(async () => {
    try {
      console.log('Generating initial suggested queries after onboarding');
      
      // Get user profile and location context
      let userProfile: any = undefined;
      let locationContext: any = undefined;
      
      try {
        const userRaw = localStorage.getItem('cropwise-user-data');
        if (userRaw) {
          userProfile = JSON.parse(userRaw);
        }
        
        const locRaw = localStorage.getItem('cropwise-selected-location');
        if (locRaw) {
          const loc = JSON.parse(locRaw);
          if (loc) {
            locationContext = {
              address: loc.address || [loc.cityName, loc.stateName].filter(Boolean).join(', '),
              cityName: loc.cityName,
              stateName: loc.stateName,
              areaSizeAcres: loc.areaSizeAcres || (typeof loc.areaSize === 'number' ? `${(loc.areaSize * 0.000247105).toFixed(2)} acres` : undefined),
              locationAddress: loc.address || [loc.cityName, loc.stateName].filter(Boolean).join(', '),
              latitude: loc.lat,
              longitude: loc.lng,
              areaSizeSqMeters: loc.areaSize
            };
          }
        }
      } catch (e) {
        console.warn('Failed to load user context for onboarding queries:', e);
      }

      // Create initial conversation context for onboarding
      const language = userProfile?.language || 'English';
      const welcomeMessage = language === 'ଓଡ଼ିଆ' ? 
        'ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର କୃଷି ସହାୟକ। ଆପଣଙ୍କ ଫସଲ ବିଷୟରେ କୌଣସି ପ୍ରଶ୍ନ ଅଛି କି?' :
        language === 'हिंदी' ?
        'नमस्कार! मैं आपका कृषि सहायक हूँ। आपकी फसल के बारे में कोई सवाल है?' :
        'Hello! I am your farming assistant. Do you have any questions about your crops?';

      const assistantResponse = language === 'ଓଡ଼ିଆ' ?
        `ନମସ୍କାର ${userProfile?.name || 'କୃଷକ ଭାଇ'}! ମୁଁ ଆପଣଙ୍କର ${userProfile?.mainCrops || 'ଫସଲ'} ଚାଷ ପାଇଁ ସାହାଯ୍ୟ କରିବାକୁ ଏଠାରେ ଅଛି। ଆପଣଙ୍କ ${locationContext?.cityName || 'ଅଞ୍ଚଳ'}ର ପାଣିପାଗ ଓ ବଜାର ଦର ବିଷୟରେ ମଧ୍ୟ ସୂଚନା ଦେଇପାରିବି।` :
        language === 'हिंदी' ?
        `नमस्कार ${userProfile?.name || 'किसान भाई'}! मैं आपकी ${userProfile?.mainCrops || 'फसल'} की खेती में मदद करने के लिए यहाँ हूँ। आपके ${locationContext?.cityName || 'क्षेत्र'} के मौसम और बाज़ार भाव की जानकारी भी दे सकता हूँ।` :
        `Hello ${userProfile?.name || 'Farmer'}! I'm here to help with your ${userProfile?.mainCrops || 'crops'} farming. I can also provide weather and market information for ${locationContext?.cityName || 'your area'}.`;

      // Create initial messages for suggestion generation
      const initialMessages: ChatMessage[] = [
        { role: 'user', content: welcomeMessage, id: 'onboarding-user', parts: [] },
        { role: 'assistant', content: assistantResponse, id: 'onboarding-assistant', parts: [] }
      ];

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/suggested-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: initialMessages,
          userProfile,
          ...(locationContext ? { locationContext } : {})
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const queries = data.suggestedQueries || [];
        
        if (queries.length > 0) {
          const contextHash = computeContextHash(initialMessages);
          
          // Save to both global and current thread
          await chatDB.saveSuggestedQueries(queries, contextHash, 'global');
          if (currentThreadId && currentThreadId !== 'global') {
            await chatDB.saveSuggestedQueries(queries, contextHash, currentThreadId);
          }
          
          setState(prev => ({ 
            ...prev, 
            queries, 
            isLoading: false, 
            lastUpdated: new Date().toISOString(),
            error: null 
          }));
          
          console.log('Generated onboarding suggested queries:', queries.length);
        } else {
          setState(prev => ({ ...prev, isLoading: false, error: 'No queries generated' }));
        }
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to generate onboarding queries:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to generate queries' 
      }));
    }
  }, [currentThreadId]);

  return {
    suggestedQueries: state.queries,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    generateSuggestedQueries,
    generateNow,
    generateOnboardingQueries, // Add the new function
    clearSuggestedQueries,
    refreshSuggestedQueries,
    shouldRegenerateQueries,
  };
};
