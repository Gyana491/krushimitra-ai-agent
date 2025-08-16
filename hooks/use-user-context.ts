import { useEffect, useState, useCallback } from 'react';

// Shape of the user context we want to expose to the agent
export interface UserContext {
  name?: string;
  location?: string; // City, State, Country
  language?: string; // Preferred language (e.g., en, hi)
  farmType?: string;
  experience?: string;
  mainCrops?: string; // Comma separated list
  farmSize?: string;
  goals?: string;
  // Add any additional runtime context
  currentTimestamp?: string;
}

const LOCAL_STORAGE_KEY = 'userProfileData';

/**
 * useUserContext retrieves (and optionally persists) lightweight user profile data
 * which will be attached to every chat request so the agent can produce
 * context-aware answers.
 */
export function useUserContext() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  // Load from localStorage (client-side only)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUserContext({ ...parsed, currentTimestamp: new Date().toISOString() });
        }
      }
    } catch (e) {
      // Fail silently; context is optional
      console.warn('Failed to parse user profile from localStorage', e);
    }
  }, []);

  const updateUserContext = useCallback((partial: Partial<UserContext>) => {
    setUserContext(prev => {
      const next = { ...(prev || {}), ...partial };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.warn('Failed to persist user profile', e);
      }
      return next;
    });
  }, []);

  return { userContext, updateUserContext };
}
