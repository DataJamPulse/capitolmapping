import { UnitAvailability, AvailabilityStatus, AvailabilityPeriod } from './types'

/**
 * Get the current availability status for a unit
 * Checks if today falls within any availability period
 */
export function getCurrentAvailability(
  availability: UnitAvailability | undefined,
  date: Date = new Date()
): AvailabilityPeriod | null {
  if (!availability || availability.periods.length === 0) {
    return null
  }

  const dateStr = date.toISOString().split('T')[0]

  // Find the period that contains the given date
  const activePeriod = availability.periods.find(period => {
    return dateStr >= period.startDate && dateStr <= period.endDate
  })

  return activePeriod || null
}

/**
 * Get availability status for a specific date range (e.g., campaign flight)
 * Returns the "worst" status if multiple periods overlap
 */
export function getAvailabilityForRange(
  availability: UnitAvailability | undefined,
  startDate: string,
  endDate: string
): AvailabilityStatus {
  if (!availability || availability.periods.length === 0) {
    return 'available' // No data means assume available
  }

  // Priority: sold > hold > pending > available
  const statusPriority: Record<AvailabilityStatus, number> = {
    sold: 4,
    hold: 3,
    pending: 2,
    available: 1,
  }

  let worstStatus: AvailabilityStatus = 'available'

  for (const period of availability.periods) {
    // Check if periods overlap
    if (period.startDate <= endDate && period.endDate >= startDate) {
      if (statusPriority[period.status] > statusPriority[worstStatus]) {
        worstStatus = period.status
      }
    }
  }

  return worstStatus
}

/**
 * Get all periods that overlap with a date range
 */
export function getOverlappingPeriods(
  availability: UnitAvailability | undefined,
  startDate: string,
  endDate: string
): AvailabilityPeriod[] {
  if (!availability) return []

  return availability.periods.filter(period => {
    return period.startDate <= endDate && period.endDate >= startDate
  })
}

/**
 * Format a date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const yearOptions: Intl.DateTimeFormatOptions = { ...options, year: 'numeric' }

  // If same year, don't repeat year
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', yearOptions)}`
  }

  return `${start.toLocaleDateString('en-US', yearOptions)} - ${end.toLocaleDateString('en-US', yearOptions)}`
}

/**
 * Get display properties for a status
 */
export function getStatusDisplay(status: AvailabilityStatus) {
  switch (status) {
    case 'available':
      return {
        label: 'Available',
        color: 'bg-green-100 text-green-800',
        dotColor: 'bg-green-500',
        borderColor: 'border-green-500',
      }
    case 'sold':
      return {
        label: 'Sold',
        color: 'bg-red-100 text-red-800',
        dotColor: 'bg-red-500',
        borderColor: 'border-red-500',
      }
    case 'hold':
      return {
        label: 'On Hold',
        color: 'bg-amber-100 text-amber-800',
        dotColor: 'bg-amber-500',
        borderColor: 'border-amber-500',
      }
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-blue-100 text-blue-800',
        dotColor: 'bg-blue-500',
        borderColor: 'border-blue-500',
      }
  }
}

/**
 * Generate a 4-week period starting from a date (standard OOH cycle)
 */
export function generate4WeekPeriod(startDate: Date = new Date()): { startDate: string; endDate: string } {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 27) // 4 weeks = 28 days

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

/**
 * Get the next available 4-week period for a unit
 */
export function getNextAvailablePeriod(
  availability: UnitAvailability | undefined,
  startFrom: Date = new Date()
): { startDate: string; endDate: string } | null {
  if (!availability || availability.periods.length === 0) {
    return generate4WeekPeriod(startFrom)
  }

  // Look for gaps in the sold/hold periods
  const sortedPeriods = [...availability.periods]
    .filter(p => p.status === 'sold' || p.status === 'hold')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  let checkDate = new Date(startFrom)

  for (const period of sortedPeriods) {
    const periodStart = new Date(period.startDate)
    const periodEnd = new Date(period.endDate)

    if (checkDate < periodStart) {
      // There's a gap before this period
      const proposedEnd = new Date(checkDate)
      proposedEnd.setDate(proposedEnd.getDate() + 27)

      if (proposedEnd < periodStart) {
        return {
          startDate: checkDate.toISOString().split('T')[0],
          endDate: proposedEnd.toISOString().split('T')[0],
        }
      }
    }

    // Move check date past this period
    if (checkDate <= periodEnd) {
      checkDate = new Date(periodEnd)
      checkDate.setDate(checkDate.getDate() + 1)
    }
  }

  // No blocking periods after checkDate, return 4 weeks from there
  return generate4WeekPeriod(checkDate)
}
