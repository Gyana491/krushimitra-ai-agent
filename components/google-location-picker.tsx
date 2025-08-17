"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin } from 'lucide-react'

// Minimal structural typings for Google Maps Places API objects we use
type GooglePlace = {
  formatted_address?: string;
  geometry?: { location?: { lat(): number; lng(): number } };
  address_components?: Array<{ long_name: string; types: string[] }>;
};

interface GoogleAutocomplete {
  addListener(eventName: 'place_changed', callback: () => void): void;
  getPlace(): GooglePlace;
}

declare const google: {
  maps: {
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        opts: { types: string[]; fields: string[] }
      ) => GoogleAutocomplete;
    };
  };
};

// Note: We avoid augmenting Window typing for google to prevent conflicts; runtime checks use optional chaining.

export interface SelectedLocationData { address: string; latitude: number; longitude: number; cityName?: string; stateName?: string; country?: string }
interface GoogleLocationPickerProps { value?: string; onChange: (loc: SelectedLocationData) => void; placeholder?: string; className?: string; autoSaveToLocalStorage?: boolean }

export function GoogleLocationPicker({ value, onChange, placeholder, className, autoSaveToLocalStorage = true }: GoogleLocationPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
  if (window.google?.maps?.places) { setScriptLoaded(true); return }
    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null
    if (existing) { existing.addEventListener('load', () => setScriptLoaded(true)); return }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    if (!apiKey) { setError('Missing Google Maps API key'); return }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en`
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setError('Failed to load Google Maps')
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || typeof google === 'undefined') return
    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, { types: ['geocode'], fields: ['formatted_address','geometry','address_components'] })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace(); if (!place?.geometry?.location) return
        const lat = place.geometry.location.lat(); const lng = place.geometry.location.lng()
        let city: string | undefined; let state: string | undefined; let country: string | undefined
        if (place.address_components) for (const comp of place.address_components) { if (comp.types.includes('locality')) city = comp.long_name; if (comp.types.includes('administrative_area_level_1')) state = comp.long_name; if (comp.types.includes('country')) country = comp.long_name; if (!city && comp.types.includes('administrative_area_level_2')) city = comp.long_name }
        const loc: SelectedLocationData = { address: place.formatted_address || inputRef.current!.value, latitude: lat, longitude: lng, cityName: city, stateName: state, country }
        onChange(loc)
        if (autoSaveToLocalStorage) try { localStorage.setItem('cropwise-selected-location', JSON.stringify({ address: loc.address, cityName: loc.cityName, stateName: loc.stateName, lat: loc.latitude, lng: loc.longitude })); window.dispatchEvent(new Event('selectedLocationChanged')) } catch {}
      })
    } catch { setError('Autocomplete failed to initialize') }
  }, [scriptLoaded, onChange, autoSaveToLocalStorage])

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(pos => { const { latitude, longitude } = pos.coords; const loc: SelectedLocationData = { address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude }; onChange(loc); setLoading(false) }, err => { setError(err.message); setLoading(false) })
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input ref={inputRef} defaultValue={value} placeholder={placeholder || 'Search location'} disabled={!!error} />
        <Button
          type="button"
            variant="outline"
            onClick={handleUseGeolocation}
            disabled={loading}
            aria-label={loading ? 'Detecting location...' : 'Autodetect location'}
            title={loading ? 'Detecting location...' : 'Autodetect location'}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" aria-hidden="true" />}
        </Button>
      </div>
      {!scriptLoaded && !error && <p className="text-xs text-muted-foreground mt-1">Loading map services...</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default GoogleLocationPicker
