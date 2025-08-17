"use client";
import { useState, useEffect, useCallback } from 'react';

export interface SelectedLocation {
  address: string;
  cityName?: string;
  stateName?: string;
  lat?: number;
  lng?: number;
  bounds?: { north: number; south: number; east: number; west: number };
  areaSize?: number;
  areaSizeAcres?: string;
}

export function useSelectedLocation() {
  const [loc, setLoc] = useState<SelectedLocation | null>(null);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem('cropwise-selected-location');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.address) {
          setLoc(parsed);
          return;
        }
      }
    } catch {}
    setLoc(null);
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [load]);

  return {
    selectedLocation: loc,
    address: loc?.address || '',
    city: loc?.cityName || '',
    state: loc?.stateName || '',
    reloadSelectedLocation: load,
  };
}
