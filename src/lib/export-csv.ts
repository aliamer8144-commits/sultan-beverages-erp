/**
 * Export data to CSV file with UTF-8 BOM for Arabic text support
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: string[]
): void {
  if (data.length === 0) return

  // Get headers from provided list or from object keys
  const csvHeaders = headers || Object.keys(data[0])

  // Build CSV content with BOM for Excel Arabic support
  const bom = '\uFEFF'
  const headerRow = csvHeaders.join(',')
  const rows = data.map((row) =>
    csvHeaders
      .map((header) => {
        const value = row[header]
        const str = value === null || value === undefined ? '' : String(value)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const escaped = str.replace(/"/g, '""')
        return `"${escaped}"`
      })
      .join(',')
  )

  const csvContent = bom + headerRow + '\n' + rows.join('\n')

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
