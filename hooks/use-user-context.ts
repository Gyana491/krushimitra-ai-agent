import { useEffect, useState, useCallback } from 'react';

// Shape of the user context we want to expose to the agent
export interface UserContext {
  name?: string;
  location?: string; // Derived from selected location (read-only)
  language?: string; // Preferred language (e.g., en, hi)
  farmType?: string;
  experience?: string;
  mainCrops?: string[]; // Array of crop names
  farmSize?: string;
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

  // Load from localStorage and override location from cropwise-selected-location
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        let base: any = {};
        if (raw) {
          try { base = JSON.parse(raw); } catch { base = {}; }
        }
        // Derive location string from selected location data
        let derivedLocation: string | undefined;
        try {
          const locRaw = window.localStorage.getItem('cropwise-selected-location');
          if (locRaw) {
            const loc = JSON.parse(locRaw);
            if (loc?.cityName && loc?.stateName) {
              derivedLocation = `${loc.cityName}, ${loc.stateName}`;
            } else if (loc?.address) {
              derivedLocation = loc.address;
            }
          }
        } catch {}
        // Migrate legacy mainCrops string -> array
        if (base.mainCrops && !Array.isArray(base.mainCrops) && typeof base.mainCrops === 'string') {
          base.mainCrops = base.mainCrops.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean);
        }
        const merged = { ...base, location: derivedLocation || base.location, currentTimestamp: new Date().toISOString() };
        setUserContext(merged);
      }
    } catch (e) {
      console.warn('Failed to build user context', e);
    }
  }, []);

  const updateUserContext = useCallback((partial: Partial<UserContext>) => {
    // Ignore any attempt to directly set location; it's derived
    const { location: _ignored, ...rest } = partial as any;
    if (rest.mainCrops && !Array.isArray(rest.mainCrops)) {
      // Allow passing comma separated string still
      if (typeof rest.mainCrops === 'string') {
        rest.mainCrops = rest.mainCrops.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean);
      } else {
        delete rest.mainCrops;
      }
    }
    setUserContext(prev => {
      const next = { ...(prev || {}), ...rest };
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
