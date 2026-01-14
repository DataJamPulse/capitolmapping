'use client'

import { useState } from 'react'
import { Unit } from '@/lib/types'
import { generateShareUrl, copyToClipboard } from '@/lib/share'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  selectedUnits: Unit[]
  allUnits: Unit[]
}

export default function ShareModal({ isOpen, onClose, selectedUnits }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const shareUrl = generateShareUrl(
    typeof window !== 'undefined' ? window.location.origin : '',
    { selectedUnits: selectedUnits.map(u => u.id) }
  )

  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadSellSheet = (unit: Unit) => {
    if (unit.sellsheet) {
      window.open(unit.sellsheet, '_blank')
    }
  }

  const handleDownloadAll = () => {
    // Download each sell sheet that exists
    selectedUnits.forEach((unit, index) => {
      if (unit.sellsheet) {
        // Stagger downloads to avoid browser blocking
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = unit.sellsheet!
          link.download = `${unit.id}-SellSheet.pdf`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, index * 300)
      }
    })
  }

  const unitsWithSellsheets = selectedUnits.filter(u => u.sellsheet)
  const totalWeeklyImpressions = selectedUnits.reduce(
    (sum, u) => sum + (u.weeklyImpressions || u.dailyImpressions * 7), 0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-capitol-red text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Share Proposal</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/70 text-sm mt-1">
            Share link or download Capitol sell sheets
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-capitol-light rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-capitol-red block">
                {selectedUnits.length}
              </span>
              <span className="text-xs text-gray-500">Units</span>
            </div>
            <div className="bg-capitol-light rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-capitol-red block">
                {(totalWeeklyImpressions / 1000000).toFixed(1)}M
              </span>
              <span className="text-xs text-gray-500">Weekly Imps</span>
            </div>
            <div className="bg-capitol-light rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-capitol-red block">
                {new Set(selectedUnits.map(u => u.market)).size}
              </span>
              <span className="text-xs text-gray-500">Markets</span>
            </div>
          </div>

          {/* Share URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">Share Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sell Sheets Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-500">
                Sell Sheets ({unitsWithSellsheets.length} available)
              </label>
              {unitsWithSellsheets.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  className="text-xs text-capitol-red hover:text-capitol-red-dark font-medium"
                >
                  Download All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedUnits.map(unit => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-capitol-red/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-capitol-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-700 truncate">{unit.id}</p>
                      <p className="text-xs text-gray-500 truncate">{unit.market}</p>
                    </div>
                  </div>

                  {unit.sellsheet ? (
                    <button
                      onClick={() => handleDownloadSellSheet(unit)}
                      className="flex-shrink-0 px-3 py-1.5 bg-capitol-red hover:bg-capitol-red-dark text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      PDF
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">No PDF</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
