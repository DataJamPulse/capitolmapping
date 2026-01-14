import { ShareState } from './types'

/**
 * Encodes selected unit IDs into a URL-safe string
 * @param unitIds - Array of unit IDs to encode
 * @returns URL-safe encoded string
 */
export function encodeShareState(state: ShareState): string {
  // Simple comma-separated encoding for unit IDs
  // This keeps URLs readable and short
  const params = new URLSearchParams()

  if (state.selectedUnits.length > 0) {
    params.set('units', state.selectedUnits.join(','))
  }

  if (state.center) {
    params.set('lat', state.center.lat.toFixed(6))
    params.set('lng', state.center.lng.toFixed(6))
  }

  if (state.zoom) {
    params.set('z', state.zoom.toString())
  }

  return params.toString()
}

/**
 * Decodes a URL search string into a ShareState object
 * @param searchParams - URL search parameters string
 * @returns ShareState object
 */
export function decodeShareState(searchParams: string): ShareState {
  const params = new URLSearchParams(searchParams)

  const unitsParam = params.get('units')
  const selectedUnits = unitsParam ? unitsParam.split(',').filter(Boolean) : []

  const lat = params.get('lat')
  const lng = params.get('lng')
  const center = lat && lng
    ? { lat: parseFloat(lat), lng: parseFloat(lng) }
    : undefined

  const z = params.get('z')
  const zoom = z ? parseInt(z, 10) : undefined

  return {
    selectedUnits,
    center,
    zoom,
  }
}

/**
 * Generates a full shareable URL
 * @param baseUrl - Base URL of the application
 * @param state - ShareState to encode
 * @returns Full shareable URL
 */
export function generateShareUrl(baseUrl: string, state: ShareState): string {
  const encoded = encodeShareState(state)
  return `${baseUrl}/share/?${encoded}`
}

/**
 * Copies text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}
