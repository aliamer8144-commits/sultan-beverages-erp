/**
 * CSV Import Utility for Sultan Beverages ERP
 * Supports UTF-8 BOM stripping, quoted fields, auto-delimiter detection
 */

// ─── Strip UTF-8 BOM ───────────────────────────────────────────────
function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1)
  }
  // Handle UTF-8 BOM as bytes: EF BB BF
  if (text.charCodeAt(0) === 0xef && text.charCodeAt(1) === 0xbb && text.charCodeAt(2) === 0xbf) {
    return text.slice(3)
  }
  return text
}

// ─── Detect delimiter (comma, semicolon, tab) ─────────────────────
function detectDelimiter(lines: string[]): string {
  if (lines.length === 0) return ','

  const firstLine = lines[0]
  const candidates = [',', ';', '\t']
  let bestDelimiter = ','
  let bestCount = 0

  for (const delim of candidates) {
    const count = firstLine.split(delim).length - 1
    if (count > bestCount) {
      bestCount = count
      bestDelimiter = delim
    }
  }

  return bestDelimiter
}

// ─── Parse a single line respecting quoted fields ──────────────────
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    i++
  }

  fields.push(current.trim())
  return fields
}

// ─── Main parse function ──────────────────────────────────────────
export function parseCSV(csvText: string, maxRows: number = 10000): Record<string, string>[] {
  // Strip BOM
  let text = stripBOM(csvText)

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split into lines
  const lines = text.split('\n').filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    throw new Error('ملف CSV فارغ أو يحتوي على صف واحد فقط')
  }

  // Check row limit (+1 for header)
  if (lines.length > maxRows + 1) {
    throw new Error(`الحد الأقصى ${maxRows} صف — الملف يحتوي على ${lines.length - 1} صف`)
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines)

  // Parse header row
  const headers = parseLine(lines[0], delimiter)

  if (headers.length === 0) {
    throw new Error('لم يتم العثور على أعمدة في الملف')
  }

  // Parse data rows
  const results: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i], delimiter)
    const row: Record<string, string> = {}

    headers.forEach((header, idx) => {
      const cleanHeader = header.trim()
      if (cleanHeader) {
        row[cleanHeader] = fields[idx] || ''
      }
    })

    results.push(row)
  }

  return results
}
