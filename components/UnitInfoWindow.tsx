'use client'

import { Unit } from '@/lib/types'
import { generateStreetViewUrl } from '@/lib/streetview'

interface UnitInfoWindowProps {
  unit: Unit
  isSelected: boolean
  onToggleSelect: (unitId: string) => void
  onClose: () => void
}

export default function UnitInfoWindow({ unit, isSelected, onToggleSelect, onClose }: UnitInfoWindowProps) {
  const streetViewUrl = generateStreetViewUrl(unit.lat, unit.lng, unit.streetViewHeading)

  const typeColors: Record<string, string> = {
    billboard: 'bg-blue-100 text-blue-800',
    wallscape: 'bg-purple-100 text-purple-800',
    digital: 'bg-green-100 text-green-800',
    transit: 'bg-orange-100 text-orange-800',
    kiosk: 'bg-pink-100 text-pink-800',
  }

  return (
    <div className="w-80 bg-white rounded-xl overflow-hidden shadow-xl">
      {/* Image */}
      <div className="relative h-40 bg-capitol-light">
        <img
          src={unit.image}
          alt={unit.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            target.parentElement!.innerHTML = `
              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-capitol-red to-capitol-red-dark">
                <span class="text-white/50 text-sm">Image not available</span>
              </div>
            `
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Type badge */}
        <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium capitalize ${typeColors[unit.type] || 'bg-gray-100 text-gray-800'}`}>
          {unit.type}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-capitol-gray mb-1">{unit.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{unit.address}</p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-gray-500 block text-xs">Size</span>
            <span className="font-medium text-capitol-gray text-xs">{unit.size}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-gray-500 block text-xs">Facing</span>
            <span className="font-medium text-capitol-gray text-xs">{unit.facing}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-gray-500 block text-xs">Weekly Impressions</span>
            <span className="font-medium text-capitol-gray text-xs">{(unit.weeklyImpressions || unit.dailyImpressions * 7).toLocaleString()}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <span className="text-gray-500 block text-xs">Features</span>
            <span className="font-medium text-capitol-gray text-xs">
              {unit.illuminated ? 'Illuminated' : 'Standard'}
              {unit.digital ? ', Digital' : ''}
            </span>
          </div>
        </div>

        {/* Geopath ID */}
        {unit.geopathId && unit.geopathId !== 'TBD' && (
          <div className="text-xs text-gray-400 mb-2">
            Geopath ID: {unit.geopathId}
          </div>
        )}

        {/* Notes */}
        {unit.notes && (
          <p className="text-xs text-gray-500 italic mb-4">{unit.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-capitol-gray px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Street View
          </a>
          <button
            onClick={() => onToggleSelect(unit.id)}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              isSelected
                ? 'bg-green-500 text-white'
                : 'bg-capitol-red hover:bg-capitol-red-dark text-white'
            }`}
          >
            {isSelected ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selected
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Select
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
