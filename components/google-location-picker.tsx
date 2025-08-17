"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin } from 'lucide-react'

// Minimal Google Maps type surface (avoid pulling full @types/google.maps)
interface MinimalGeocoderResult {
  formatted_address: string;
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
}
type GeocodeStatus = 'OK' | string;
interface GoogleMapsLike {
  maps: {
    places: {
      Autocomplete: new (el: HTMLInputElement, opts: { types: string[]; fields: string[] }) => {
        addListener: (ev: string, cb: () => void) => void;
        getPlace: () => {
          geometry?: { location?: { lat: () => number; lng: () => number } };
          formatted_address?: string;
          address_components?: Array<{ long_name: string; types: string[] }>;
        };
      };
    };
    Geocoder: new () => {
      geocode: (
        req: { location: { lat: number; lng: number } },
        cb: (results: MinimalGeocoderResult[] | null, status: GeocodeStatus) => void
      ) => void;
    };
  };
}
declare const google: GoogleMapsLike; // Runtime provided by script

export interface SelectedLocationData { address: string; latitude: number; longitude: number; cityName?: string; stateName?: string; country?: string }
interface GoogleLocationPickerProps { value?: string; onChange: (loc: SelectedLocationData) => void; placeholder?: string; className?: string; autoSaveToLocalStorage?: boolean }

export function GoogleLocationPicker({ value, onChange, placeholder, className, autoSaveToLocalStorage = true }: GoogleLocationPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
  // Narrow global google existence without explicit any usage
  const w = window as unknown as { google?: { maps?: { places?: unknown } } }
  if (w.google?.maps?.places) { setScriptLoaded(true); return }
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
  const autocomplete = new google.maps.places.Autocomplete(inputRef.current, { 
        types: ['geocode'], 
        fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
      })
      
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place?.geometry?.location) return
        
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        
        let city: string | undefined
        let state: string | undefined 
  let country: string | undefined
        
        // Parse address components for detailed information
        if (place.address_components) {
          for (const comp of place.address_components) {
            if (comp.types.includes('locality')) {
              city = comp.long_name
            }
            if (comp.types.includes('administrative_area_level_1')) {
              state = comp.long_name
            }
            if (comp.types.includes('country')) {
              country = comp.long_name
            }
            // postal_code intentionally ignored (unused)
            // Fallback for city if locality not found
            if (!city && comp.types.includes('administrative_area_level_2')) {
              city = comp.long_name
            }
          }
        }
        
        // Use the formatted address from Google (includes complete address with postal code)
        const completeAddress = place.formatted_address || inputRef.current!.value
        
        const loc: SelectedLocationData = { 
          address: completeAddress, 
          latitude: lat, 
          longitude: lng, 
          cityName: city, 
          stateName: state, 
          country 
        }
        
        onChange(loc)
        
        if (autoSaveToLocalStorage) {
          try { 
            localStorage.setItem('cropwise-selected-location', JSON.stringify({ 
              address: loc.address, 
              cityName: loc.cityName, 
              stateName: loc.stateName, 
              lat: loc.latitude, 
              lng: loc.longitude 
            }))
            window.dispatchEvent(new Event('selectedLocationChanged'))
          } catch {}
        }
      })
    } catch { 
      setError('Autocomplete failed to initialize') 
    }
  }, [scriptLoaded, onChange, autoSaveToLocalStorage])

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setLoading(true)
    setError(null)
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        
        try {
          // Try to get address using Google Maps Geocoding if available
          if (scriptLoaded && typeof google !== 'undefined') {
            const geocoder = new google.maps.Geocoder()
        const result = await new Promise<MinimalGeocoderResult[]>((resolve, reject) => {
              geocoder.geocode(
                { location: { lat: latitude, lng: longitude } },
          (results: MinimalGeocoderResult[] | null, status: GeocodeStatus) => {
                  if (status === 'OK' && results?.[0]) {
                      resolve(results)
                  } else {
                    reject(new Error('Geocoding failed'))
                  }
                }
              )
            })
            
            const place = result[0]
            let city: string | undefined, state: string | undefined, country: string | undefined
            
            if (place.address_components) {
              for (const comp of place.address_components) {
                if (comp.types.includes('locality')) city = comp.long_name
                if (comp.types.includes('administrative_area_level_1')) state = comp.long_name
                if (comp.types.includes('country')) country = comp.long_name
                if (!city && comp.types.includes('administrative_area_level_2')) city = comp.long_name
              }
            }
            
            const loc: SelectedLocationData = {
              address: place.formatted_address,
              latitude,
              longitude,
              cityName: city,
              stateName: state,
              country
            }
            
            // Update the input field with the detected address
            if (inputRef.current) {
              inputRef.current.value = place.formatted_address
            }
            
            onChange(loc)
          } else {
            // Fallback: use coordinates as address
            const loc: SelectedLocationData = {
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              latitude,
              longitude
            }
            
            if (inputRef.current) {
              inputRef.current.value = loc.address
            }
            
            onChange(loc)
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error)
          // Fallback to coordinates
          const loc: SelectedLocationData = {
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude,
            longitude
          }
          
          if (inputRef.current) {
            inputRef.current.value = loc.address
          }
          
          onChange(loc)
        }
        
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input ref={inputRef} defaultValue={value} placeholder={placeholder || 'Search location'} disabled={!!error} className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={handleUseGeolocation}
            disabled={loading}
            aria-label={loading ? 'Detecting location...' : 'Autodetect location'}
            title={loading ? 'Detecting location...' : 'Autodetect location'}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" aria-hidden="true" />}
            <span>{loading ? 'Detecting...' : 'Autodetect'}</span>
          </Button>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">
          Click &quot;Autodetect&quot; to use your current location or search for a location above
        </div>
      </div>
      {!scriptLoaded && !error && <p className="text-xs text-muted-foreground mt-1">Loading map services...</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default GoogleLocationPicker
