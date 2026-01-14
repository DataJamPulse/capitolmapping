/**
 * Generates a Google Street View URL for a given location
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param heading - Direction to face (0-360 degrees, 0 = North)
 * @returns Google Maps Street View URL
 */
export function generateStreetViewUrl(
  lat: number,
  lng: number,
  heading: number = 0
): string {
  // Google Maps Street View URL format
  // The parameters are:
  // - @lat,lng - coordinates
  // - 3a - zoom level (lower = more zoomed out)
  // - 75y - field of view in degrees
  // - {heading}h - horizontal direction (0-360)
  // - 90t - pitch (90 = level, 0 = up, 180 = down)
  return `https://www.google.com/maps/@${lat},${lng},3a,75y,${heading}h,90t/data=!3m6!1e1!3m4!1s`
}

/**
 * Generates a simple Google Maps directions URL
 * @param lat - Latitude of the destination
 * @param lng - Longitude of the destination
 * @returns Google Maps directions URL
 */
export function generateDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/**
 * Generates a Google Maps URL for a specific location
 * @param lat - Latitude
 * @param lng - Longitude
 * @param zoom - Zoom level (default 17)
 * @returns Google Maps URL
 */
export function generateMapUrl(
  lat: number,
  lng: number,
  zoom: number = 17
): string {
  return `https://www.google.com/maps/@${lat},${lng},${zoom}z`
}
