'use client';

import { useState, useEffect } from 'react';
import { chatDB } from '@/lib/chat-db';

export interface GlobalSuggestedQueriesState {
  queries: string[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export function useGlobalSuggestedQueries() {
  const [state, setState] = useState<GlobalSuggestedQueriesState>({
    queries: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // Load global suggested queries from IndexedDB
  useEffect(() => {
    const loadGlobalQueries = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const globalQueries = await chatDB.getSuggestedQueries('global');
        
        if (globalQueries) {
          setState({
            queries: globalQueries.queries || [],
            isLoading: false,
            error: null,
            lastUpdated: globalQueries.lastUpdated
          });
        } else {
          // No global queries found, set empty state
          setState({
            queries: [],
            isLoading: false,
            error: null,
            lastUpdated: null
          });
        }
      } catch (error) {
        console.error('Failed to load global suggested queries:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load queries'
        }));
      }
    };

    loadGlobalQueries();
  }, []);

  // Refresh global queries manually
  const refreshGlobalQueries = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const globalQueries = await chatDB.getSuggestedQueries('global');
      
      setState({
        queries: globalQueries?.queries || [],
        isLoading: false,
        error: null,
        lastUpdated: globalQueries?.lastUpdated || null
      });
    } catch (error) {
      console.error('Failed to refresh global suggested queries:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh queries'
      }));
    }
  };

  // Force regenerate global queries (bypasses cache)
  const regenerateGlobalQueries = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get user profile and location context for regeneration
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
        console.warn('Failed to load user context for global queries regeneration:', e);
      }

      // Create initial conversation context
      const language = userProfile?.language || 'English';
      const welcomeMessage = language === 'ଓଡ଼ିଆ' ? 
        `ନମସ୍କାର ${userProfile?.name || 'କୃଷକ ଭାଇ'}! ମୁଁ ଆପଣଙ୍କର ${userProfile?.mainCrops || 'ଫସଲ'} ଚାଷ ପାଇଁ ସାହାଯ୍ୟ କରିବାକୁ ଏଠାରେ ଅଛି। ଆପଣଙ୍କ ${locationContext?.cityName || 'ଅଞ୍ଚଳ'}ର ମୌସମ ଏବଂ ବଜାର ଦାମ ବିଷୟରେ ମଧ୍ୟ ଜଣାଇ ପାରିବି।` :
        language === 'हिंदी' ?
        `नमस्कार ${userProfile?.name || 'किसान भाई'}! मैं आपकी ${userProfile?.mainCrops || 'फसल'} की खेती में मदद करने के लिए यहाँ हूँ। आपके ${locationContext?.cityName || 'क्षेत्र'} के मौसम और बाज़ार भाव की जानकारी भी दे सकता हूँ।` :
        `Hello ${userProfile?.name || 'Farmer'}! I'm here to help with your ${userProfile?.mainCrops || 'crops'} farming. I can also provide weather and market information for ${locationContext?.cityName || 'your area'}.`;

      const assistantResponse = language === 'ଓଡ଼ିଆ' ?
        'ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର କୃଷି ସହାୟକ। ଆପଣଙ୍କ ଫସଲ ବିଷୟରେ କୌଣସି ପ୍ରଶ୍ନ ଅଛି କି?' :
        language === 'हिंदी' ?
        'नमस्कार! मैं आपका कृषि सहायक हूँ। आपकी फसल के बारे में कोई प्रश्न है?' :
        'Hello! I\'m your farming assistant. Any questions about your crops?';

      // Create initial messages for suggestion generation
      const initialMessages = [
        { role: 'user', content: welcomeMessage, id: 'global-user', parts: [] },
        { role: 'assistant', content: assistantResponse, id: 'global-assistant', parts: [] }
      ];

      // Add timestamp and random ID to force bypass cache
      const forceParams = {
        forceRegenerate: true,
        timestamp: Date.now(),
        requestId: Math.random().toString(36).substring(7)
      };

      const response = await fetch('/api/suggested-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: initialMessages,
          userProfile,
          ...(locationContext ? { locationContext } : {}),
          ...forceParams
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const queries = data.suggestedQueries || [];
        
        if (queries.length > 0) {
          // Save to global in IndexedDB
          await chatDB.saveSuggestedQueries(queries, 'force-global', 'global');
          
          setState({
            queries,
            isLoading: false,
            error: null,
            lastUpdated: new Date().toISOString()
          });
          
          console.log('Regenerated global suggested queries:', queries.length);
        } else {
          setState(prev => ({ ...prev, isLoading: false, error: 'No queries generated' }));
        }
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to regenerate global queries:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to regenerate queries' 
      }));
    }
  };

  return {
    queries: state.queries,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refreshGlobalQueries,
    regenerateGlobalQueries
  };
}
