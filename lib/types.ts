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
