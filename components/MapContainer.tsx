'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF, TrafficLayer } from '@react-google-maps/api'
import { Unit } from '@/lib/types'
import UnitInfoWindow from './UnitInfoWindow'

// Libraries to load with Google Maps
const libraries: ('places')[] = ['places']

interface MapContainerProps {
  units: Unit[]
  selectedIds: Set<string>
  onToggleSelect: (unitId: string) => void
  center?: { lat: number; lng: number }
  zoom?: number
  focusedUnit?: Unit | null
  onFocusedUnitChange?: (unit: Unit | null) => void
  searchLocation?: { lat: number; lng: number } | null
  onGoogleLoaded?: (isLoaded: boolean) => void
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795, // Center of US
}

const defaultZoom = 4

// Map styling for Capitol branding
const mapStyles = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#e9e9e9' }, { lightness: 17 }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }, { lightness: 20 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffffff' }, { lightness: 17 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#ffffff' }, { lightness: 29 }, { weight: 0.2 }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }, { lightness: 18 }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }, { lightness: 16 }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }, { lightness: 21 }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#dedede' }, { lightness: 21 }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'on' }, { color: '#ffffff' }, { lightness: 16 }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ saturation: 36 }, { color: '#333333' }, { lightness: 40 }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#f2f2f2' }, { lightness: 19 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.fill',
    stylers: [{ color: '#fefefe' }, { lightness: 20 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#fefefe' }, { lightness: 17 }, { weight: 1.2 }],
  },
]

// Marker colors by type
const markerColors: Record<string, string> = {
  billboard: '#C41230', // Capitol red
  wallscape: '#7C3AED', // Purple
  digital: '#10B981', // Green
  transit: '#F59E0B', // Orange
  kiosk: '#EC4899', // Pink
}

export default function MapContainer({
  units,
  selectedIds,
  onToggleSelect,
  center = defaultCenter,
  zoom = defaultZoom,
  focusedUnit,
  onFocusedUnitChange,
  searchLocation,
  onGoogleLoaded,
}: MapContainerProps) {
  const [activeMarker, setActiveMarker] = useState<string | null>(null)
  const [showTraffic, setShowTraffic] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Load Google Maps with Places library
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Notify parent when Google Maps is loaded
  useEffect(() => {
    if (onGoogleLoaded) {
      onGoogleLoaded(isLoaded)
    }
  }, [isLoaded, onGoogleLoaded])

  // Handle focused unit from sidebar
  useEffect(() => {
    if (focusedUnit && mapRef.current) {
      mapRef.current.panTo({ lat: focusedUnit.lat, lng: focusedUnit.lng })
      mapRef.current.setZoom(15)
      setActiveMarker(focusedUnit.id)
    }
  }, [focusedUnit])

  // Handle search location - pan to it when set
  useEffect(() => {
    if (searchLocation && mapRef.current) {
      mapRef.current.panTo(searchLocation)
      mapRef.current.setZoom(11)
    }
  }, [searchLocation])

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const onUnmount = useCallback(() => {
    mapRef.current = null
  }, [])

  const handleMarkerClick = (unit: Unit) => {
    setActiveMarker(unit.id)
    onFocusedUnitChange?.(unit)
  }

  const handleInfoWindowClose = () => {
    setActiveMarker(null)
    onFocusedUnitChange?.(null)
  }

  // Create custom marker icon
  const createMarkerIcon = (unit: Unit) => {
    const color = markerColors[unit.type] || markerColors.billboard
    const isSelected = selectedIds.has(unit.id)
    const scale = isSelected ? 1.3 : 1

    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: isSelected ? '#10B981' : color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: scale,
      anchor: new google.maps.Point(12, 24),
    }
  }

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 font-medium">Error loading Google Maps</p>
          <p className="text-sm text-gray-500 mt-2">Please check your API key configuration</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-capitol-red border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    )
  }

  const activeUnit = units.find(u => u.id === activeMarker)

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Traffic Layer */}
        {showTraffic && <TrafficLayer />}

        {/* Radius circle around focused unit (500 feet = ~152 meters) */}
        {focusedUnit && (
          <CircleF
            center={{ lat: focusedUnit.lat, lng: focusedUnit.lng }}
            radius={152}
            options={{
              fillColor: '#C41230',
              fillOpacity: 0.1,
              strokeColor: '#C41230',
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />
        )}

        {/* Search location marker */}
        {searchLocation && (
          <MarkerF
            position={searchLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 12,
            }}
            title="Search Location"
            zIndex={1000}
          />
        )}

        {units.map(unit => (
          <MarkerF
            key={unit.id}
            position={{ lat: unit.lat, lng: unit.lng }}
            onClick={() => handleMarkerClick(unit)}
            icon={createMarkerIcon(unit)}
            title={unit.name}
          />
        ))}

        {activeMarker && activeUnit && (
          <InfoWindowF
            position={{ lat: activeUnit.lat, lng: activeUnit.lng }}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new google.maps.Size(0, -30),
              maxWidth: 350,
            }}
          >
            <UnitInfoWindow
              unit={activeUnit}
              isSelected={selectedIds.has(activeUnit.id)}
              onToggleSelect={onToggleSelect}
              onClose={handleInfoWindowClose}
            />
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Traffic Layer Toggle Button */}
      <button
        onClick={() => setShowTraffic(!showTraffic)}
        className={`absolute top-4 right-4 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-colors ${
          showTraffic
            ? 'bg-capitol-red text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title="Toggle Traffic Layer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        Traffic
      </button>
    </div>
  )
}
