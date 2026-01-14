'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import MapContainer from '@/components/MapContainer'
import Sidebar from '@/components/Sidebar'
import ShareModal from '@/components/ShareModal'
import { Unit } from '@/lib/types'
import inventoryData from '@/data/inventory.json'

export default function Home() {
  const [units] = useState<Unit[]>(inventoryData.units as Unit[])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marketFilter, setMarketFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [focusedUnit, setFocusedUnit] = useState<Unit | null>(null)

  const handleToggleSelect = useCallback((unitId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(unitId)) {
        newSet.delete(unitId)
      } else {
        newSet.add(unitId)
      }
      return newSet
    })
  }, [])

  const handleUnitClick = useCallback((unit: Unit) => {
    setFocusedUnit(unit)
  }, [])

  const handleLocationSearch = useCallback((lat: number, lng: number) => {
    setSearchLocation({ lat, lng })
  }, [])

  const handleClearLocationSearch = useCallback(() => {
    setSearchLocation(null)
  }, [])

  // Filter units for map display
  let filteredUnits = units
  if (marketFilter) {
    filteredUnits = filteredUnits.filter(u => u.market === marketFilter)
  }
  if (typeFilter) {
    filteredUnits = filteredUnits.filter(u => u.type === typeFilter)
  }

  const selectedUnits = units.filter(u => selectedIds.has(u.id))

  return (
    <div className="h-screen flex flex-col">
      <Header
        selectedCount={selectedIds.size}
        onShareClick={() => setIsShareModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          units={units}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onUnitClick={handleUnitClick}
          marketFilter={marketFilter}
          onMarketFilterChange={setMarketFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          onLocationSearch={handleLocationSearch}
          searchLocation={searchLocation}
          onClearLocationSearch={handleClearLocationSearch}
        />

        {/* Map */}
        <div className="flex-1">
          <MapContainer
            units={filteredUnits}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            focusedUnit={focusedUnit}
            onFocusedUnitChange={setFocusedUnit}
            searchLocation={searchLocation}
          />
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        selectedUnits={selectedUnits}
        allUnits={units}
      />
    </div>
  )
}
