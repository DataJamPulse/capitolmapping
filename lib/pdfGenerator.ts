import jsPDF from 'jspdf'
import { Unit } from './types'

const CAPITOL_RED = '#C41230'
const CAPITOL_DARK = '#1A1A1A'
const CAPITOL_GRAY = '#4A4A4A'

export async function generateSellSheet(unit: Unit): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  // Load and add unit image
  try {
    const imgUrl = unit.image.startsWith('/') ? window.location.origin + unit.image : unit.image
    const imgData = await loadImageAsBase64(imgUrl)
    if (imgData) {
      // Image takes top portion of page
      doc.addImage(imgData, 'JPEG', margin, margin, pageWidth - margin * 2, 90)
    }
  } catch (e) {
    // Draw placeholder if image fails
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, margin, pageWidth - margin * 2, 90, 'F')
    doc.setFontSize(12)
    doc.setTextColor(150, 150, 150)
    doc.text('Image not available', pageWidth / 2, 60, { align: 'center' })
  }

  // Unit type badge
  const typeLabel = unit.type.toUpperCase()
  doc.setFillColor(196, 18, 48) // Capitol red
  doc.roundedRect(margin, 110, 30, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(typeLabel, margin + 15, 115.5, { align: 'center' })

  // Unit ID
  doc.setFontSize(28)
  doc.setTextColor(26, 26, 26)
  doc.setFont('helvetica', 'bold')
  doc.text(unit.id, margin, 130)

  // Address
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(74, 74, 74)
  const address = unit.address !== 'Address TBD' ? unit.address : `${unit.market}`
  doc.text(address, margin, 138)

  // Specs grid - 2 columns
  const specY = 150
  const col1X = margin
  const col2X = pageWidth / 2 + 5
  const rowHeight = 18

  // Draw spec boxes
  const drawSpec = (label: string, value: string, x: number, y: number) => {
    doc.setFillColor(248, 248, 248)
    doc.roundedRect(x, y, (pageWidth - margin * 2 - 10) / 2, rowHeight - 2, 2, 2, 'F')

    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 4, y + 5)

    doc.setFontSize(11)
    doc.setTextColor(26, 26, 26)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 4, y + 12)
  }

  // Row 1
  drawSpec('Size', unit.size || 'TBD', col1X, specY)
  drawSpec('Weekly Impressions', (unit.weeklyImpressions || unit.dailyImpressions * 7).toLocaleString(), col2X, specY)

  // Row 2
  drawSpec('Facing', unit.facing || 'TBD', col1X, specY + rowHeight)
  drawSpec('Illuminated', unit.illuminated ? 'Yes' : 'No', col2X, specY + rowHeight)

  // Row 3
  drawSpec('Latitude', unit.lat.toFixed(6), col1X, specY + rowHeight * 2)
  drawSpec('Longitude', unit.lng.toFixed(6), col2X, specY + rowHeight * 2)

  // Row 4
  const readDirection = unit.streetViewHeading >= 180 ? 'Right-hand' : 'Left-hand'
  drawSpec('Read', readDirection, col1X, specY + rowHeight * 3)
  drawSpec('Geopath ID', unit.geopathId || 'TBD', col2X, specY + rowHeight * 3)

  // Notes/Description
  if (unit.notes && unit.notes.length > 0) {
    const notesY = specY + rowHeight * 4 + 10
    doc.setFontSize(10)
    doc.setTextColor(74, 74, 74)
    doc.setFont('helvetica', 'normal')

    // Word wrap the notes
    const maxWidth = pageWidth - margin * 2
    const lines = doc.splitTextToSize(unit.notes, maxWidth)
    doc.text(lines.slice(0, 4), margin, notesY) // Limit to 4 lines
  }

  // Footer with Capitol branding
  const footerY = pageHeight - 25

  // Red line
  doc.setDrawColor(196, 18, 48)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  // Capitol logo text (since we can't easily embed the logo)
  doc.setFontSize(16)
  doc.setTextColor(196, 18, 48)
  doc.setFont('helvetica', 'bold')
  doc.text('CAPITOL', margin, footerY + 2)
  doc.setFontSize(10)
  doc.text('OUTDOOR', margin, footerY + 7)

  // Contact info
  doc.setFontSize(9)
  doc.setTextColor(74, 74, 74)
  doc.setFont('helvetica', 'normal')
  doc.text('DC Office: 202.337.1839', pageWidth - margin, footerY, { align: 'right' })
  doc.text('chris@capitoloutdoor.com', pageWidth - margin, footerY + 5, { align: 'right' })
  doc.text('CapitolOutdoor.com', pageWidth - margin, footerY + 10, { align: 'right' })

  return doc
}

export async function generateMultipleSellSheets(units: Unit[]): Promise<jsPDF> {
  if (units.length === 0) {
    throw new Error('No units provided')
  }

  // Generate first page
  const doc = await generateSellSheet(units[0])

  // Add subsequent pages
  for (let i = 1; i < units.length; i++) {
    doc.addPage()
    const tempDoc = await generateSellSheet(units[i])

    // Copy content from temp doc to main doc
    // Since jsPDF doesn't support copying, we regenerate on each page
    const unit = units[i]
    await addUnitPage(doc, unit)
  }

  return doc
}

async function addUnitPage(doc: jsPDF, unit: Unit): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  // Load and add unit image
  try {
    const imgUrl = unit.image.startsWith('/') ? window.location.origin + unit.image : unit.image
    const imgData = await loadImageAsBase64(imgUrl)
    if (imgData) {
      doc.addImage(imgData, 'JPEG', margin, margin, pageWidth - margin * 2, 90)
    }
  } catch (e) {
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, margin, pageWidth - margin * 2, 90, 'F')
    doc.setFontSize(12)
    doc.setTextColor(150, 150, 150)
    doc.text('Image not available', pageWidth / 2, 60, { align: 'center' })
  }

  // Unit type badge
  const typeLabel = unit.type.toUpperCase()
  doc.setFillColor(196, 18, 48)
  doc.roundedRect(margin, 110, 30, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(typeLabel, margin + 15, 115.5, { align: 'center' })

  // Unit ID
  doc.setFontSize(28)
  doc.setTextColor(26, 26, 26)
  doc.setFont('helvetica', 'bold')
  doc.text(unit.id, margin, 130)

  // Address
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(74, 74, 74)
  const address = unit.address !== 'Address TBD' ? unit.address : `${unit.market}`
  doc.text(address, margin, 138)

  // Specs grid
  const specY = 150
  const col1X = margin
  const col2X = pageWidth / 2 + 5
  const rowHeight = 18

  const drawSpec = (label: string, value: string, x: number, y: number) => {
    doc.setFillColor(248, 248, 248)
    doc.roundedRect(x, y, (pageWidth - margin * 2 - 10) / 2, rowHeight - 2, 2, 2, 'F')

    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 4, y + 5)

    doc.setFontSize(11)
    doc.setTextColor(26, 26, 26)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 4, y + 12)
  }

  drawSpec('Size', unit.size || 'TBD', col1X, specY)
  drawSpec('Weekly Impressions', (unit.weeklyImpressions || unit.dailyImpressions * 7).toLocaleString(), col2X, specY)
  drawSpec('Facing', unit.facing || 'TBD', col1X, specY + rowHeight)
  drawSpec('Illuminated', unit.illuminated ? 'Yes' : 'No', col2X, specY + rowHeight)
  drawSpec('Latitude', unit.lat.toFixed(6), col1X, specY + rowHeight * 2)
  drawSpec('Longitude', unit.lng.toFixed(6), col2X, specY + rowHeight * 2)

  const readDirection = unit.streetViewHeading >= 180 ? 'Right-hand' : 'Left-hand'
  drawSpec('Read', readDirection, col1X, specY + rowHeight * 3)
  drawSpec('Geopath ID', unit.geopathId || 'TBD', col2X, specY + rowHeight * 3)

  if (unit.notes && unit.notes.length > 0) {
    const notesY = specY + rowHeight * 4 + 10
    doc.setFontSize(10)
    doc.setTextColor(74, 74, 74)
    doc.setFont('helvetica', 'normal')
    const maxWidth = pageWidth - margin * 2
    const lines = doc.splitTextToSize(unit.notes, maxWidth)
    doc.text(lines.slice(0, 4), margin, notesY)
  }

  // Footer
  const footerY = pageHeight - 25
  doc.setDrawColor(196, 18, 48)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setFontSize(16)
  doc.setTextColor(196, 18, 48)
  doc.setFont('helvetica', 'bold')
  doc.text('CAPITOL', margin, footerY + 2)
  doc.setFontSize(10)
  doc.text('OUTDOOR', margin, footerY + 7)

  doc.setFontSize(9)
  doc.setTextColor(74, 74, 74)
  doc.setFont('helvetica', 'normal')
  doc.text('DC Office: 202.337.1839', pageWidth - margin, footerY, { align: 'right' })
  doc.text('chris@capitoloutdoor.com', pageWidth - margin, footerY + 5, { align: 'right' })
  doc.text('CapitolOutdoor.com', pageWidth - margin, footerY + 10, { align: 'right' })
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      } else {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename)
}
