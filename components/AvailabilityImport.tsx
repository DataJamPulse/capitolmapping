'use client'

import { useState, useRef } from 'react'
import { UnitAvailability, AvailabilityPeriod, AvailabilityStatus } from '@/lib/types'

interface AvailabilityImportProps {
  onImport: (availability: Map<string, UnitAvailability>) => void
  onClose: () => void
  unitIds: string[] // Valid unit IDs for validation
}

interface ParsedRow {
  unitId: string
  startDate: string
  endDate: string
  status: AvailabilityStatus
  client?: string
  notes?: string
}

interface ParseError {
  row: number
  message: string
}

export default function AvailabilityImport({ onImport, onClose, unitIds }: AvailabilityImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<ParseError[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validStatuses: AvailabilityStatus[] = ['available', 'sold', 'hold', 'pending']

  const parseCSV = (text: string): { rows: ParsedRow[]; errors: ParseError[] } => {
    const lines = text.trim().split('\n')
    const rows: ParsedRow[] = []
    const errors: ParseError[] = []

    // Expect header row
    const header = lines[0]?.toLowerCase().split(',').map(h => h.trim())

    // Find column indices
    const unitIdIdx = header?.findIndex(h => h === 'unit_id' || h === 'unitid' || h === 'unit id' || h === 'id')
    const startIdx = header?.findIndex(h => h === 'start_date' || h === 'startdate' || h === 'start' || h === 'from')
    const endIdx = header?.findIndex(h => h === 'end_date' || h === 'enddate' || h === 'end' || h === 'to')
    const statusIdx = header?.findIndex(h => h === 'status' || h === 'availability')
    const clientIdx = header?.findIndex(h => h === 'client' || h === 'advertiser' || h === 'customer')
    const notesIdx = header?.findIndex(h => h === 'notes' || h === 'comments')

    if (unitIdIdx === -1 || startIdx === -1 || endIdx === -1 || statusIdx === -1) {
      errors.push({
        row: 1,
        message: 'Missing required columns. Expected: unit_id, start_date, end_date, status'
      })
      return { rows, errors }
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Handle quoted values with commas
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const unitId = values[unitIdIdx]?.replace(/"/g, '')
      const startDate = values[startIdx]?.replace(/"/g, '')
      const endDate = values[endIdx]?.replace(/"/g, '')
      const status = values[statusIdx]?.replace(/"/g, '').toLowerCase() as AvailabilityStatus
      const client = clientIdx !== -1 ? values[clientIdx]?.replace(/"/g, '') : undefined
      const notes = notesIdx !== -1 ? values[notesIdx]?.replace(/"/g, '') : undefined

      // Validate
      if (!unitId) {
        errors.push({ row: i + 1, message: 'Missing unit ID' })
        continue
      }

      if (!unitIds.includes(unitId)) {
        errors.push({ row: i + 1, message: `Unknown unit ID: ${unitId}` })
        continue
      }

      if (!startDate || !isValidDate(startDate)) {
        errors.push({ row: i + 1, message: `Invalid start date: ${startDate}` })
        continue
      }

      if (!endDate || !isValidDate(endDate)) {
        errors.push({ row: i + 1, message: `Invalid end date: ${endDate}` })
        continue
      }

      if (!validStatuses.includes(status)) {
        errors.push({ row: i + 1, message: `Invalid status: ${status}. Must be: available, sold, hold, or pending` })
        continue
      }

      rows.push({
        unitId,
        startDate: normalizeDate(startDate),
        endDate: normalizeDate(endDate),
        status,
        client: client || undefined,
        notes: notes || undefined,
      })
    }

    return { rows, errors }
  }

  const isValidDate = (dateStr: string): boolean => {
    // Support various formats: YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY
    const date = new Date(dateStr)
    return !isNaN(date.getTime())
  }

  const normalizeDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  }

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsProcessing(true)
    setErrors([])
    setParsedData([])

    try {
      const text = await selectedFile.text()
      const { rows, errors } = parseCSV(text)
      setParsedData(rows)
      setErrors(errors)
    } catch (e) {
      setErrors([{ row: 0, message: 'Failed to read file' }])
    }

    setIsProcessing(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      handleFile(droppedFile)
    } else {
      setErrors([{ row: 0, message: 'Please upload a CSV file' }])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const handleImport = () => {
    const availabilityMap = new Map<string, UnitAvailability>()
    const now = new Date().toISOString()

    parsedData.forEach(row => {
      const period: AvailabilityPeriod = {
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        client: row.client,
        notes: row.notes,
      }

      if (availabilityMap.has(row.unitId)) {
        availabilityMap.get(row.unitId)!.periods.push(period)
      } else {
        availabilityMap.set(row.unitId, {
          unitId: row.unitId,
          periods: [period],
          lastUpdated: now,
        })
      }
    })

    onImport(availabilityMap)
    onClose()
  }

  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'sold': return 'bg-red-100 text-red-800'
      case 'hold': return 'bg-amber-100 text-amber-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Import Availability</h2>
            <p className="text-sm text-gray-500">Upload a CSV file with unit availability data</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-capitol-red bg-capitol-red/5'
                : 'border-gray-300 hover:border-capitol-red hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 mb-2">
              {file ? file.name : 'Drop your CSV file here or click to browse'}
            </p>
            <p className="text-xs text-gray-400">
              Required columns: unit_id, start_date, end_date, status
            </p>
          </div>

          {/* Format Help */}
          <details className="bg-gray-50 rounded-lg p-3">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              CSV Format Guide
            </summary>
            <div className="mt-3 text-xs text-gray-600 space-y-2">
              <p>Your CSV should have the following columns:</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-1 pr-4">Column</th>
                    <th className="py-1 pr-4">Required</th>
                    <th className="py-1">Values</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1 pr-4 font-mono">unit_id</td><td className="pr-4">Yes</td><td>Must match existing unit ID</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">start_date</td><td className="pr-4">Yes</td><td>YYYY-MM-DD or MM/DD/YYYY</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">end_date</td><td className="pr-4">Yes</td><td>YYYY-MM-DD or MM/DD/YYYY</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">status</td><td className="pr-4">Yes</td><td>available, sold, hold, pending</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">client</td><td className="pr-4">No</td><td>Client/advertiser name</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">notes</td><td className="pr-4">No</td><td>Additional notes</td></tr>
                </tbody>
              </table>
              <p className="mt-2 pt-2 border-t border-gray-200">
                Example: <code className="bg-gray-200 px-1 rounded">AC-10D,2026-02-01,2026-02-28,sold,Acme Corp,4-week campaign</code>
              </p>
            </div>
          </details>

          {/* Processing State */}
          {isProcessing && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-capitol-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Processing file...</p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                {errors.length} error{errors.length > 1 ? 's' : ''} found
              </h4>
              <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i}>
                    {err.row > 0 && <span className="font-medium">Row {err.row}:</span>} {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Preview ({parsedData.length} records)
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Unit ID</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Period</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Client</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono">{row.unitId}</td>
                          <td className="py-2 px-3">{row.startDate} → {row.endDate}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500">{row.client || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 20 && (
                  <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
                    + {parsedData.length - 20} more records
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {parsedData.length > 0 && errors.length === 0 && (
              <span className="text-green-600">Ready to import {parsedData.length} records</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parsedData.length === 0 || errors.length > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-capitol-red hover:bg-capitol-red-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {parsedData.length > 0 && `(${parsedData.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
