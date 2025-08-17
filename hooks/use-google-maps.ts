import { useEffect, useState } from 'react'

interface UseGoogleMapsOptions {
  apiKey?: string
  libraries?: string[]
}

declare global {
  interface Window {
    initGoogleMapsCallback?: () => void
    google: any
  }
}

export function useGoogleMaps({ apiKey, libraries = ['places'] }: UseGoogleMapsOptions) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.google && window.google.maps) {
      setLoaded(true)
      return
    }

    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true))
      existing.addEventListener('error', () => setError('Failed to load Google Maps'))
      return
    }

    if (!apiKey) {
      setError('Missing Google Maps API key')
      return
    }

    ;(window as any).initGoogleMapsCallback = () => {
      setLoaded(true)
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&callback=initGoogleMapsCallback&v=weekly`
    script.async = true
    script.defer = true
    script.onerror = () => setError('Failed to load Google Maps')
    document.head.appendChild(script)
  }, [apiKey, libraries])

  return { loaded, error }
}
