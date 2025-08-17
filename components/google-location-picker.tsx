/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { MapPin, Loader2 } from 'lucide-react'

interface GoogleLocationPickerProps {
  apiKey: string
  value?: string
  onChange?: (data: { address: string; lat: number; lng: number; bounds?: { north: number; south: number; east: number; west: number } }) => void
  localStorageKey?: string
  className?: string
  showMap?: boolean
  height?: number
  allowAreaSelection?: boolean
}

export const GoogleLocationPicker: React.FC<GoogleLocationPickerProps> = ({
  apiKey,
  value,
  onChange,
  localStorageKey = 'selected_location',
  className,
  showMap = true,
  height = 260,
  allowAreaSelection = true
}) => {
  const { loaded, error } = useGoogleMaps({ apiKey, libraries: ['places','geometry','drawing'] })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<any>(null)
  const autocompleteRef = useRef<any>(null)
  const drawingManagerRef = useRef<any>(null)
  const selectedAreaRef = useRef<any>(null)
  const [address, setAddress] = useState(value || '')
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null)
  const [selectedBounds, setSelectedBounds] = useState<{north:number;south:number;east:number;west:number} | null>(null)
  const [areaSize, setAreaSize] = useState<number | null>(null) // Area in square meters
  const [cityName, setCityName] = useState<string>('')
  const [stateName, setStateName] = useState<string>('')

  // Load from local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(localStorageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.address && parsed.lat && parsed.lng) {
          setAddress(parsed.address)
          setCoords({ lat: parsed.lat, lng: parsed.lng })
          if (parsed.bounds) {
            setSelectedBounds(parsed.bounds)
          }
          if (parsed.areaSize) {
            setAreaSize(parsed.areaSize)
          }
          if (parsed.cityName) {
            setCityName(parsed.cityName)
          }
          if (parsed.stateName) {
            setStateName(parsed.stateName)
          }
          // Log the stored area size in acres for debugging
          if (parsed.areaSizeAcres) {
            console.log("Loaded area size from storage:", parsed.areaSizeAcres)
          }
        }
      } catch {}
    }
  }, [localStorageKey])

  useEffect(() => {
    if (!loaded || !window.google || !inputRef.current) return

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry','formatted_address','name','address_components']
    })
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (!place || !place.geometry) return
      const loc = place.geometry.location
      const lat = loc.lat()
      const lng = loc.lng()
      const formatted = place.formatted_address || place.name || ''
      
      // Extract city and state from address components
      let cityName = ''
      let stateName = ''
      
      if (place.address_components) {
        for (const component of place.address_components) {
          const types = component.types
          if (types.includes('locality')) {
            cityName = component.long_name
          } else if (types.includes('administrative_area_level_1')) {
            stateName = component.long_name
          }
        }
      }
      
      setAddress(formatted)
      setCoords({ lat, lng })
      setCityName(cityName)
      setStateName(stateName)
      // Don't persist automatically - wait for explicit save
      console.log("Location selected:", formatted, lat, lng, "City:", cityName, "State:", stateName)
      if (onChange) onChange({ address: formatted, lat, lng, bounds: selectedBounds || undefined })
      if (mapRef.current && window.google) {
        const map = mapInstance()
        map.setCenter({ lat, lng })
        map.setZoom(18) // Maximum zoom for detail
        updateMarker(lat,lng)
      }
    })
  }, [loaded])

  const mapInstance = () => {
    if (!mapRef.current) return null
    if (!(mapRef.current as any)._map && window.google) {
      const initialZoom = coords ? 18 : 4 // Maximum zoom when we have coordinates
      ;(mapRef.current as any)._map = new window.google.maps.Map(mapRef.current, {
        center: coords || { lat: 20.5937, lng: 78.9629 },
        zoom: initialZoom,
        mapTypeId: window.google.maps.MapTypeId.SATELLITE, // Only satellite view
        mapTypeControl: false, // Disable map type switching
        streetViewControl: true,
        fullscreenControl: false,
        maxZoom: 20 // Allow maximum zoom
      })
      
      // Initialize drawing manager for area selection
      if (allowAreaSelection && window.google.maps.drawing) {
        drawingManagerRef.current = new window.google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: window.google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              window.google.maps.drawing.OverlayType.RECTANGLE,
              window.google.maps.drawing.OverlayType.POLYGON,
              window.google.maps.drawing.OverlayType.CIRCLE
            ]
          },
          rectangleOptions: {
            fillColor: '#ff0000',
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1
          },
          polygonOptions: {
            fillColor: '#ff0000',
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1
          },
          circleOptions: {
            fillColor: '#ff0000',
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1
          }
        })
        
        drawingManagerRef.current.setMap((mapRef.current as any)._map)
        
        // Handle area selection events
        drawingManagerRef.current.addListener('overlaycomplete', (event: any) => {
          // Clear previous selection
          if (selectedAreaRef.current) {
            selectedAreaRef.current.setMap(null)
          }
          
          selectedAreaRef.current = event.overlay
          const bounds = getOverlayBounds(event.overlay, event.type)
          const area = calculateArea(event.overlay, event.type)
          
          if (bounds) {
            setSelectedBounds(bounds)
            setAreaSize(area)
            // Don't persist automatically - wait for explicit save
            console.log("Area selected:", bounds, "Area:", area, "Acres:", formatAreaSize(area))
            if (onChange) {
              onChange({ 
                address, 
                lat: coords?.lat || 0, 
                lng: coords?.lng || 0, 
                bounds 
              })
            }
          }
          
          // Clear drawing mode
          drawingManagerRef.current.setDrawingMode(null)
        })
      }
      
      // If we have saved bounds, restore the selected area
      if (selectedBounds && allowAreaSelection) {
        restoreSelectedArea()
      }
    }
    return (mapRef.current as any)._map
  }

  const updateMarker = (lat:number,lng:number) => {
    const map = mapInstance()
    if (!map) return
    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map,
        draggable: true,
        position: { lat, lng }
      })
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition()
        if (!pos) return
        const nLat = pos.lat(); const nLng = pos.lng()
        setCoords({ lat: nLat, lng: nLng })
        // Reverse geocode minimal
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat: nLat, lng: nLng } }, (results:any,status:any) => {
          if (status === 'OK' && results && results[0]) {
            const addr = results[0].formatted_address
            setAddress(addr)
            persist(addr,nLat,nLng)
            onChange?.({ address: addr, lat: nLat, lng: nLng, bounds: selectedBounds || undefined })
          }
        })
      })
    } else {
      markerRef.current.setPosition({ lat, lng })
    }
  }

  // Helper function to get bounds from different overlay types
  const getOverlayBounds = (overlay: any, type: any) => {
    if (!window.google) return null
    
    if (type === window.google.maps.drawing.OverlayType.RECTANGLE) {
      const bounds = overlay.getBounds()
      return {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng()
      }
    } else if (type === window.google.maps.drawing.OverlayType.CIRCLE) {
      const center = overlay.getCenter()
      const radius = overlay.getRadius()
      const bounds = new window.google.maps.Circle({ center, radius }).getBounds()
      return {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng()
      }
    } else if (type === window.google.maps.drawing.OverlayType.POLYGON) {
      const path = overlay.getPath()
      const bounds = new window.google.maps.LatLngBounds()
      path.forEach((latLng: any) => bounds.extend(latLng))
      return {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng()
      }
    }
    return null
  }

  // Calculate area of selected region in square meters
  const calculateArea = (overlay: any, type: any): number => {
    if (!window.google) return 0
    
    if (type === window.google.maps.drawing.OverlayType.RECTANGLE) {
      const bounds = overlay.getBounds()
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const nw = new window.google.maps.LatLng(ne.lat(), sw.lng())
      
      // Calculate width and height using spherical geometry
      const width = window.google.maps.geometry.spherical.computeDistanceBetween(nw, ne)
      const height = window.google.maps.geometry.spherical.computeDistanceBetween(nw, sw)
      return width * height
    } 
    else if (type === window.google.maps.drawing.OverlayType.CIRCLE) {
      const radius = overlay.getRadius()
      return Math.PI * radius * radius
    } 
    else if (type === window.google.maps.drawing.OverlayType.POLYGON) {
      const path = overlay.getPath()
      return window.google.maps.geometry.spherical.computeArea(path)
    }
    
    return 0
  }

  // Format area size for display in acres
  const formatAreaSize = (areaSqMeters: number): string => {
    const acres = areaSqMeters * 0.000247105 // Convert square meters to acres
    
    if (acres < 0.01) {
      return `${Math.round(areaSqMeters)} m²`
    } else if (acres < 1) {
      return `${acres.toFixed(3)} acres`
    } else if (acres < 100) {
      return `${acres.toFixed(2)} acres`
    } else {
      return `${acres.toFixed(1)} acres`
    }
  }

  // Restore selected area from saved bounds
  const restoreSelectedArea = () => {
    if (!selectedBounds || !window.google) return
    
    const map = mapInstance()
    if (!map) return
    
    // Create a rectangle from saved bounds
    selectedAreaRef.current = new window.google.maps.Rectangle({
      bounds: {
        north: selectedBounds.north,
        south: selectedBounds.south,
        east: selectedBounds.east,
        west: selectedBounds.west
      },
      fillColor: '#ff0000',
      fillOpacity: 0.2,
      strokeWeight: 2,
      editable: true,
      map
    })
    
    // Fit map to selected area
    const bounds = new window.google.maps.LatLngBounds(
      { lat: selectedBounds.south, lng: selectedBounds.west },
      { lat: selectedBounds.north, lng: selectedBounds.east }
    )
    map.fitBounds(bounds)
    map.setZoom(Math.min(map.getZoom() || 18, 18)) // Limit to max zoom
  }

  // Enhanced persist function with bounds
  const persistWithBounds = (address: string, lat: number, lng: number, bounds?: any, areaSize?: number, city?: string, state?: string) => {
    try {
      const data: any = { address, lat, lng }
      if (bounds) data.bounds = bounds
      if (areaSize) {
        data.areaSize = areaSize
        // Convert to acres and format for storage
        const acres = areaSize * 0.000247105
        data.areaSizeAcres = `${acres.toFixed(2)} acres`
      }
      if (city) data.cityName = city
      if (state) data.stateName = state
      localStorage.setItem(localStorageKey, JSON.stringify(data))
    } catch {}
  }

  // Manual save function that can be called from parent
  const saveCurrentDataToStorage = useCallback(() => {
    if (coords && address) {
      persistWithBounds(address, coords.lat, coords.lng, selectedBounds || undefined, areaSize || undefined, cityName || undefined, stateName || undefined)
      console.log("Data manually saved to localStorage:", { address, coords, selectedBounds, areaSize, cityName, stateName })
    }
  }, [address, coords, selectedBounds, areaSize, cityName, stateName, localStorageKey])

  // Expose save function globally for the popup to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).saveLocationData = saveCurrentDataToStorage
    }
  }, [saveCurrentDataToStorage])

  useEffect(() => {
    if (loaded && showMap && mapRef.current) {
      mapInstance()
      if (coords) updateMarker(coords.lat, coords.lng)
    }
  }, [loaded, coords, showMap])

  const persist = (address:string, lat:number, lng:number) => {
    persistWithBounds(address, lat, lng, selectedBounds || undefined, areaSize || undefined, cityName || undefined, stateName || undefined)
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setCoords({ lat, lng })
      if (mapRef.current && window.google) {
        const map = mapInstance()
        map.setCenter({ lat, lng })
        map.setZoom(18) // Maximum zoom for current location
        updateMarker(lat,lng)
      }
      // Reverse geocode
      if (window.google) {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results:any,status:any) => {
          if (status === 'OK' && results && results[0]) {
            const addr = results[0].formatted_address
            setAddress(addr)
            // Don't persist automatically - wait for explicit save
            console.log("Geolocation detected:", addr, lat, lng)
            onChange?.({ address: addr, lat, lng, bounds: selectedBounds || undefined })
          }
        })
      }
    })
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
            placeholder="Search address or place"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleUseMyLocation} disabled={!loaded} className="bg-transparent">
          <MapPin className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!loaded && !error && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading map...
        </div>
      )}
      {showMap && <div ref={mapRef} className="mt-3 rounded-md border" style={{ height }} />}
      {areaSize && (
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-medium text-green-600">
            Size: {formatAreaSize(areaSize)}
          </span>
        </p>
      )}
    </div>
  )
}

export default GoogleLocationPicker
