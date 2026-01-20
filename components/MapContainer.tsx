'use client'

import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
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
const FOCUSED_UNIT_ZOOM = 15
const SEARCH_LOCATION_ZOOM = 11

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

// Legend labels for marker types
const markerLabels: Record<string, string> = {
  billboard: 'Bulletins',
  wallscape: 'Wallscapes',
  digital: 'Digital',
  transit: 'Transit',
  kiosk: 'Kiosks',
}

// POI types to search for (expanded list)
const POI_CATEGORIES = [
  { type: 'cafe', label: 'Coffee Shops', color: '#8B4513' },
  { type: 'restaurant', label: 'Restaurants', color: '#FF6B35' },
  { type: 'bar', label: 'Bars & Pubs', color: '#7C3AED' },
  { type: 'gym', label: 'Gyms & Fitness', color: '#10B981' },
  { type: 'shopping_mall', label: 'Shopping', color: '#EC4899' },
  { type: 'school', label: 'Schools', color: '#3B82F6' },
  { type: 'park', label: 'Parks', color: '#22C55E' },
  { type: 'lodging', label: 'Hotels', color: '#F59E0B' },
  { type: 'transit_station', label: 'Transit', color: '#6366F1' },
  { type: 'movie_theater', label: 'Cinemas', color: '#EF4444' },
  { type: 'bank', label: 'Banks', color: '#14B8A6' },
  { type: 'hospital', label: 'Hospitals', color: '#DC2626' },
  { type: 'church', label: 'Places of Worship', color: '#8B5CF6' },
  { type: 'local_government_office', label: 'Government', color: '#475569' },
]

// Distance options in meters
const DISTANCE_OPTIONS = [
  { label: '300 ft', value: 91 },
  { label: '500 ft', value: 152 },
  { label: '1000 ft', value: 305 },
  { label: '1/4 mile', value: 402 },
  { label: '1/2 mile', value: 805 },
  { label: '1 mile', value: 1609 },
]

interface NearbyPOI {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  color: string
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
  const [showPOIPanel, setShowPOIPanel] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>([])
  const [loadingPOIs, setLoadingPOIs] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedPOITypes, setSelectedPOITypes] = useState<string[]>([])
  const [selectedDistance, setSelectedDistance] = useState(402) // Default 1/4 mile
  const [searchRadius, setSearchRadius] = useState<number | null>(null) // For circle display
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
      mapRef.current.setZoom(FOCUSED_UNIT_ZOOM)
      setActiveMarker(focusedUnit.id)
    }
  }, [focusedUnit])

  // Clear POIs and errors when focused unit changes
  useEffect(() => {
    setNearbyPOIs([])
    setSearchRadius(null)
    setSearchError(null)
  }, [focusedUnit])

  // Fetch POIs on demand (triggered by Search button)
  const handleSearchPOIs = async () => {
    if (!focusedUnit || !isLoaded || !mapRef.current || selectedPOITypes.length === 0) {
      return
    }

    setLoadingPOIs(true)
    setSearchError(null)
    setSearchRadius(selectedDistance)
    const service = new google.maps.places.PlacesService(mapRef.current)
    const location = new google.maps.LatLng(focusedUnit.lat, focusedUnit.lng)

    // Only search selected POI types
    const categoriesToSearch = POI_CATEGORIES.filter(c => selectedPOITypes.includes(c.type))

    // Search all categories in parallel for faster results
    const searchPromises = categoriesToSearch.map(category =>
      new Promise<{ category: typeof category; results: google.maps.places.PlaceResult[]; error?: boolean }>((resolve) => {
        service.nearbySearch(
          {
            location,
            radius: selectedDistance,
            type: category.type,
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve({ category, results })
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve({ category, results: [] })
            } else {
              console.error(`Error fetching ${category.type}: ${status}`)
              resolve({ category, results: [], error: true })
            }
          }
        )
      })
    )

    const searchResults = await Promise.all(searchPromises)

    // Collect all POIs and track errors
    const allPOIs: NearbyPOI[] = []
    const failedCategories: string[] = []

    searchResults.forEach(({ category, results, error }) => {
      if (error) {
        failedCategories.push(category.label)
      }
      results.forEach((place) => {
        if (place.geometry?.location && place.place_id) {
          allPOIs.push({
            id: place.place_id,
            name: place.name || 'Unknown',
            type: category.type,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            color: category.color,
          })
        }
      })
    })

    setNearbyPOIs(allPOIs)
    if (failedCategories.length > 0) {
      setSearchError(`Some searches failed: ${failedCategories.join(', ')}`)
    }
    setLoadingPOIs(false)
  }

  // Toggle POI type selection
  const togglePOIType = (type: string) => {
    setSelectedPOITypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Select/deselect all POI types
  const toggleAllPOITypes = () => {
    if (selectedPOITypes.length === POI_CATEGORIES.length) {
      setSelectedPOITypes([])
    } else {
      setSelectedPOITypes(POI_CATEGORIES.map(c => c.type))
    }
  }

  // Handle search location - pan to it when set
  useEffect(() => {
    if (searchLocation && mapRef.current) {
      mapRef.current.panTo(searchLocation)
      mapRef.current.setZoom(SEARCH_LOCATION_ZOOM)
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

  // Memoize marker icons to avoid recreating on every render
  const markerIcons = useMemo(() => {
    if (!isLoaded) return new Map<string, google.maps.Symbol>()

    const icons = new Map<string, google.maps.Symbol>()
    units.forEach(unit => {
      const color = markerColors[unit.type] || markerColors.billboard
      const isSelected = selectedIds.has(unit.id)
      const scale = isSelected ? 1.3 : 1

      icons.set(unit.id, {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: isSelected ? '#10B981' : color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: scale,
        anchor: new google.maps.Point(12, 24),
      })
    })
    return icons
  }, [units, selectedIds, isLoaded])

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

        {/* Radius circle around focused unit - shows after POI search */}
        {focusedUnit && searchRadius && (
          <CircleF
            center={{ lat: focusedUnit.lat, lng: focusedUnit.lng }}
            radius={searchRadius}
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
            icon={markerIcons.get(unit.id)}
            title={unit.name}
          />
        ))}

        {/* Nearby POI markers */}
        {nearbyPOIs.map((poi) => (
          <MarkerF
            key={`poi-${poi.id}`}
            position={{ lat: poi.lat, lng: poi.lng }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: poi.color,
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 8,
            }}
            title={poi.name}
            zIndex={500}
          />
        ))}

        {activeMarker && activeUnit && (
          <InfoWindowF
            position={{ lat: activeUnit.lat, lng: activeUnit.lng }}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new google.maps.Size(0, -30),
              maxWidth: 300,
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

      {/* Map Controls */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-1.5 sm:gap-2">
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`p-2 sm:px-3 sm:py-2 rounded-lg shadow-lg flex items-center justify-center sm:gap-2 text-sm font-medium transition-colors min-w-[44px] min-h-[44px] ${
            showTraffic
              ? 'bg-capitol-red text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Toggle Traffic Layer"
          aria-label="Toggle Traffic Layer"
        >
          <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          <span className="hidden sm:inline">Traffic</span>
        </button>

        <button
          onClick={() => setShowPOIPanel(!showPOIPanel)}
          className={`p-2 sm:px-3 sm:py-2 rounded-lg shadow-lg flex items-center justify-center sm:gap-2 text-sm font-medium transition-colors min-w-[44px] min-h-[44px] ${
            showPOIPanel
              ? 'bg-capitol-red text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="POI Search"
          aria-label="Search Points of Interest"
        >
          <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden sm:inline">POIs</span>
        </button>
      </div>

      {/* Unit Types Legend - Collapsible on mobile */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-white rounded-lg shadow-lg">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="sm:hidden w-full p-2 flex items-center justify-between min-h-[44px]"
          aria-label={showLegend ? 'Hide legend' : 'Show legend'}
        >
          <span className="text-xs font-semibold text-gray-500">LEGEND</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showLegend ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`${showLegend ? 'block' : 'hidden'} sm:block p-3 pt-0 sm:pt-3`}>
          <h4 className="hidden sm:block text-xs font-semibold text-gray-500 mb-2">UNIT TYPES</h4>
          <div className="space-y-1.5">
            {Object.entries(markerColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-600">{markerLabels[type]}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs pt-1 border-t border-gray-100 mt-1">
              <span className="w-3 h-3 rounded-full flex-shrink-0 bg-green-500" />
              <span className="text-gray-600">Selected</span>
            </div>
          </div>
        </div>
      </div>

      {/* POI Search Panel - Responsive: bottom sheet on mobile, side panel on desktop */}
      {showPOIPanel && (
        <div className="absolute inset-x-2 bottom-2 sm:inset-auto sm:top-16 sm:right-4 sm:bottom-auto bg-white rounded-lg shadow-lg p-3 sm:p-4 w-auto sm:w-72 max-h-[60vh] sm:max-h-none overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Find Nearby Places</h4>
            <button
              onClick={() => setShowPOIPanel(false)}
              className="text-gray-400 hover:text-gray-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1"
              aria-label="Close POI panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!focusedUnit ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Click on a unit to search for nearby places
            </p>
          ) : (
            <>
              {/* Distance Dropdown */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Distance</label>
                <select
                  value={selectedDistance}
                  onChange={(e) => setSelectedDistance(Number(e.target.value))}
                  className="w-full px-3 py-2.5 sm:px-2 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capitol-red min-h-[44px] sm:min-h-0"
                >
                  {DISTANCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* POI Types */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-500">Place Types</label>
                  <button
                    onClick={toggleAllPOITypes}
                    className="text-xs text-capitol-red hover:text-capitol-red-dark p-1 min-h-[44px] flex items-center"
                  >
                    {selectedPOITypes.length === POI_CATEGORIES.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-1 sm:p-2 grid grid-cols-2 sm:grid-cols-1 gap-0.5">
                  {POI_CATEGORIES.map(cat => (
                    <label
                      key={cat.type}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-2 sm:p-1 rounded min-h-[44px] sm:min-h-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPOITypes.includes(cat.type)}
                        onChange={() => togglePOIType(cat.type)}
                        className="w-4 h-4 sm:w-3 sm:h-3 text-capitol-red rounded border-gray-300 focus:ring-capitol-red flex-shrink-0"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-gray-600 truncate">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearchPOIs}
                disabled={selectedPOITypes.length === 0 || loadingPOIs}
                className="w-full px-3 py-3 sm:py-2 bg-capitol-red text-white rounded-lg text-sm font-medium hover:bg-capitol-red-dark active:bg-capitol-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px] sm:min-h-0"
              >
                {loadingPOIs ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search ({selectedPOITypes.length} types)
                  </>
                )}
              </button>

              {/* Error feedback */}
              {searchError && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-amber-700">{searchError}</p>
                  </div>
                </div>
              )}

              {/* Results */}
              {nearbyPOIs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-xs font-medium text-gray-500 mb-2">
                    Results ({nearbyPOIs.length} places)
                  </h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {POI_CATEGORIES.map(cat => {
                      const count = nearbyPOIs.filter(p => p.type === cat.type).length
                      if (count === 0) return null
                      return (
                        <div key={cat.type} className="flex items-center gap-2 text-xs">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-gray-600">{cat.label}</span>
                          <span className="text-gray-400 ml-auto">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
