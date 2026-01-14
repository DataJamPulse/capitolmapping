'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import MapContainer from '@/components/MapContainer'
import { Unit } from '@/lib/types'
import { decodeShareState } from '@/lib/share'
import inventoryData from '@/data/inventory.json'

function ShareContent() {
  const searchParams = useSearchParams()
  const [units] = useState<Unit[]>(inventoryData.units as Unit[])
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>()
  const [mapZoom, setMapZoom] = useState<number | undefined>()

  useEffect(() => {
    const shareState = decodeShareState(searchParams.toString())

    if (shareState.selectedUnits.length > 0) {
      const sharedUnits = units.filter(u => shareState.selectedUnits.includes(u.id))
      setFilteredUnits(sharedUnits)
      setSelectedIds(new Set(shareState.selectedUnits))

      // Calculate center from shared units
      if (sharedUnits.length > 0) {
        const avgLat = sharedUnits.reduce((sum, u) => sum + u.lat, 0) / sharedUnits.length
        const avgLng = sharedUnits.reduce((sum, u) => sum + u.lng, 0) / sharedUnits.length
        setMapCenter({ lat: avgLat, lng: avgLng })

        // Determine zoom based on spread
        const latSpread = Math.max(...sharedUnits.map(u => u.lat)) - Math.min(...sharedUnits.map(u => u.lat))
        const lngSpread = Math.max(...sharedUnits.map(u => u.lng)) - Math.min(...sharedUnits.map(u => u.lng))
        const maxSpread = Math.max(latSpread, lngSpread)

        if (maxSpread < 0.5) setMapZoom(12)
        else if (maxSpread < 2) setMapZoom(9)
        else if (maxSpread < 5) setMapZoom(7)
        else setMapZoom(5)
      }
    }
  }, [searchParams, units])

  // No-op for share view - selection is read-only
  const handleToggleSelect = () => {}

  const totalImpressions = filteredUnits.reduce((sum, u) => sum + u.dailyImpressions, 0)

  return (
    <div className="h-screen flex flex-col">
      <Header isShareMode={true} />

      {/* Info Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm text-gray-500">Units</span>
              <p className="font-semibold text-capitol-red">{filteredUnits.length}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <span className="text-sm text-gray-500">Daily Impressions</span>
              <p className="font-semibold text-capitol-red">{totalImpressions.toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <span className="text-sm text-gray-500">Markets</span>
              <p className="font-semibold text-capitol-red">
                {Array.from(new Set(filteredUnits.map(u => u.market))).join(', ') || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit List (horizontal) */}
      {filteredUnits.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 overflow-x-auto">
          <div className="flex gap-3">
            {filteredUnits.map(unit => (
              <div
                key={unit.id}
                className="flex-shrink-0 bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-capitol-red/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-capitol-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-capitol-gray">{unit.name}</p>
                  <p className="text-xs text-gray-500">{unit.market} | {unit.dailyImpressions.toLocaleString()} imp/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1">
        {filteredUnits.length > 0 ? (
          <MapContainer
            units={filteredUnits}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            center={mapCenter}
            zoom={mapZoom}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No Units Selected</h2>
              <p className="text-gray-500">This share link doesn't contain any valid units.</p>
              <a
                href="/"
                className="inline-block mt-4 bg-capitol-red hover:bg-capitol-red-dark text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                View All Units
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-capitol-red border-t-transparent rounded-full" />
      </div>
    }>
      <ShareContent />
    </Suspense>
  )
}
