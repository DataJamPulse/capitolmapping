export type AvailabilityStatus = 'available' | 'sold' | 'hold' | 'pending'

export interface AvailabilityPeriod {
  startDate: string // ISO date string (e.g., "2026-01-20")
  endDate: string
  status: AvailabilityStatus
  client?: string // Client name if sold/hold
  notes?: string
}

export interface UnitAvailability {
  unitId: string
  periods: AvailabilityPeriod[]
  lastUpdated: string // ISO date string
}

export interface Unit {
  id: string
  name: string
  type: 'billboard' | 'wallscape' | 'digital' | 'transit' | 'kiosk'
  market: string
  address: string
  lat: number
  lng: number
  size: string
  facing: string
  illuminated: boolean
  digital: boolean
  dailyImpressions: number
  weeklyImpressions?: number
  image: string
  streetViewHeading: number
  geopathId?: string
  notes?: string
  sellsheet?: string | null
}

export interface MarketFilter {
  name: string
  count: number
}

export interface ShareState {
  selectedUnits: string[]
  center?: { lat: number; lng: number }
  zoom?: number
}
