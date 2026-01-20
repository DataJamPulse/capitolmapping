'use client'

import { useState, useEffect, useRef } from 'react'
import { Unit, UnitAvailability, AvailabilityStatus } from '@/lib/types'
import { getCurrentAvailability, getStatusDisplay } from '@/lib/availability'

interface SidebarProps {
  units: Unit[]
  selectedIds: Set<string>
  onToggleSelect: (unitId: string) => void
  onUnitClick: (unit: Unit) => void
  marketFilter: string
  onMarketFilterChange: (market: string) => void
  typeFilter: string
  onTypeFilterChange: (type: string) => void
  availabilityFilter: string
  onAvailabilityFilterChange: (status: string) => void
  onLocationSearch: (lat: number, lng: number) => void
  searchLocation: { lat: number; lng: number } | null
  onClearLocationSearch: () => void
  isGoogleLoaded?: boolean
  availability: Map<string, UnitAvailability>
  onOpenAvailImport: () => void
}

export default function Sidebar({
  units,
  selectedIds,
  onToggleSelect,
  onUnitClick,
  marketFilter,
  onMarketFilterChange,
  typeFilter,
  onTypeFilterChange,
  availabilityFilter,
  onAvailabilityFilterChange,
  onLocationSearch,
  searchLocation,
  onClearLocationSearch,
  isGoogleLoaded = false,
  availability,
  onOpenAvailImport,
}: SidebarProps) {
  const [searchAddress, setSearchAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!isGoogleLoaded || !searchInputRef.current || autocompleteRef.current) return

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['geometry', 'formatted_address', 'name'],
      })

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          onLocationSearch(lat, lng)
          setSearchAddress(place.formatted_address || place.name || '')
        }
      })
    } catch (e) {
      console.error('Autocomplete init failed:', e)
    }
  }, [isGoogleLoaded, onLocationSearch])

  // Get unique markets and types
  const markets = Array.from(new Set(units.map(u => u.market))).sort()
  const types = Array.from(new Set(units.map(u => u.type))).sort()

  // Helper to get unit's current availability status
  const getUnitStatus = (unitId: string): AvailabilityStatus | null => {
    const unitAvail = availability.get(unitId)
    const currentPeriod = getCurrentAvailability(unitAvail)
    return currentPeriod?.status || null
  }

  // Filter units
  let filteredUnits = units
  if (marketFilter) {
    filteredUnits = filteredUnits.filter(u => u.market === marketFilter)
  }
  if (typeFilter) {
    filteredUnits = filteredUnits.filter(u => u.type === typeFilter)
  }
  if (availabilityFilter) {
    filteredUnits = filteredUnits.filter(u => {
      const status = getUnitStatus(u.id)
      if (availabilityFilter === 'available') {
        return status === 'available' || status === null // No data = available
      }
      return status === availabilityFilter
    })
  }

  // Sort by distance if location search is active
  if (searchLocation) {
    filteredUnits = [...filteredUnits].sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.lat - searchLocation.lat, 2) +
        Math.pow(a.lng - searchLocation.lng, 2)
      )
      const distB = Math.sqrt(
        Math.pow(b.lat - searchLocation.lat, 2) +
        Math.pow(b.lng - searchLocation.lng, 2)
      )
      return distA - distB
    })
  }

  const handleSearch = async () => {
    if (!searchAddress.trim()) return

    setIsSearching(true)
    setSearchError('')

    try {
      const geocoder = new google.maps.Geocoder()
      const result = await geocoder.geocode({ address: searchAddress })

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location
        onLocationSearch(location.lat(), location.lng())
      } else {
        setSearchError('Location not found')
      }
    } catch (error) {
      setSearchError('Search failed. Try again.')
    }

    setIsSearching(false)
  }

  const handleClearSearch = () => {
    setSearchAddress('')
    setSearchError('')
    onClearLocationSearch()
  }

  // Calculate distance in miles
  const getDistanceMiles = (unit: Unit) => {
    if (!searchLocation) return null
    const R = 3959 // Earth's radius in miles
    const dLat = (unit.lat - searchLocation.lat) * Math.PI / 180
    const dLng = (unit.lng - searchLocation.lng) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(searchLocation.lat * Math.PI / 180) * Math.cos(unit.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const typeIcons: Record<string, string> = {
    billboard: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z',
    wallscape: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    digital: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    transit: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    kiosk: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  }

  const typeLabels: Record<string, string> = {
    billboard: 'Bulletins',
    wallscape: 'Wallscapes',
    digital: 'Digital',
    transit: 'Transit',
    kiosk: 'Kiosks',
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Location Search */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Find Units Near Location
          </label>
          <div className="flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter address or place..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capitol-red"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-3 py-2 bg-capitol-red text-white rounded-lg hover:bg-capitol-red-dark transition-colors disabled:opacity-50"
            >
              {isSearching ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
          {searchError && (
            <p className="text-xs text-red-500 mt-1">{searchError}</p>
          )}
          {searchLocation && (
            <div className="flex items-center justify-between mt-2 px-2 py-1 bg-capitol-red/10 rounded text-xs">
              <span className="text-capitol-red">Sorted by distance</span>
              <button
                onClick={handleClearSearch}
                className="text-capitol-red hover:text-capitol-red-dark"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Market Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Market</label>
            <select
              value={marketFilter}
              onChange={(e) => onMarketFilterChange(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-capitol-red"
            >
              <option value="">All ({units.length})</option>
              {markets.map(market => (
                <option key={market} value={market}>
                  {market} ({units.filter(u => u.market === market).length})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Format</label>
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-capitol-red"
            >
              <option value="">All Formats</option>
              {types.map(type => (
                <option key={type} value={type}>
                  {typeLabels[type] || type} ({units.filter(u => u.type === type).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Availability Row */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Availability</label>
            <select
              value={availabilityFilter}
              onChange={(e) => onAvailabilityFilterChange(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-capitol-red"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="hold">On Hold</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={onOpenAvailImport}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Import availability from CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
        </div>

        {/* Availability data indicator */}
        {availability.size > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Availability loaded for {availability.size} units</span>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-500">
          Showing <span className="font-semibold text-capitol-dark">{filteredUnits.length}</span> units
        </span>
      </div>

      {/* Selected Summary */}
      {selectedIds.size > 0 && (
        <div className="p-4 bg-capitol-red/10 border-b border-capitol-red/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-capitol-dark">
              {selectedIds.size} selected
            </span>
            <span className="text-xs text-capitol-gray">
              {units
                .filter(u => selectedIds.has(u.id))
                .reduce((sum, u) => sum + (u.weeklyImpressions || u.dailyImpressions * 7), 0)
                .toLocaleString()}{' '}
              weekly imps
            </span>
          </div>
        </div>
      )}

      {/* Unit List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUnits.map(unit => {
          const distance = getDistanceMiles(unit)
          const unitAvail = availability.get(unit.id)
          const currentPeriod = getCurrentAvailability(unitAvail)
          const statusDisplay = currentPeriod ? getStatusDisplay(currentPeriod.status) : null

          return (
            <div
              key={unit.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedIds.has(unit.id) ? 'bg-capitol-red/5' : ''
              }`}
              onClick={() => onUnitClick(unit)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleSelect(unit.id)
                  }}
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(unit.id)
                      ? 'bg-capitol-red border-capitol-red'
                      : 'border-gray-300 hover:border-capitol-red'
                  }`}
                >
                  {selectedIds.has(unit.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Icon with availability indicator */}
                <div className="relative">
                  <div className="w-10 h-10 bg-capitol-red/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-capitol-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeIcons[unit.type] || typeIcons.billboard} />
                    </svg>
                  </div>
                  {/* Availability dot indicator */}
                  {statusDisplay && (
                    <span
                      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusDisplay.dotColor}`}
                      title={statusDisplay.label}
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-capitol-gray truncate">{unit.id}</h4>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 capitalize">
                      {unit.type}
                    </span>
                    {/* Availability badge */}
                    {statusDisplay && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusDisplay.color}`}>
                        {statusDisplay.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{unit.market}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{unit.size}</span>
                    {distance !== null && (
                      <>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-capitol-red font-medium">
                          {distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`}
                        </span>
                      </>
                    )}
                    {/* Show client if sold/hold */}
                    {currentPeriod?.client && (
                      <>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-500 truncate" title={currentPeriod.client}>
                          {currentPeriod.client}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
