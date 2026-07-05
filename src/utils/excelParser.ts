import * as XLSX from 'xlsx'
import { ExcelRow } from '../types'
import { format, parse, isValid } from 'date-fns'

export interface ParsedFile {
  headers: string[]
  rawRows: any[][]
}

export interface ColumnMapping {
  date: number
  product_name: number
  brand: number
  category: number
  stock_added: number
  quantity_sold: number
}

export const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['product_name', 'brand', 'category']

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: 'Date',
  product_name: 'Product Name',
  brand: 'Brand',
  category: 'Category',
  stock_added: 'Stock Added',
  quantity_sold: 'Quantity Sold',
}

/**
 * Reads a raw .xlsx / .xls / .csv file and returns its header row plus
 * the remaining data rows, with NO assumption about column names or order.
 */
export function readFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) throw new Error('File is empty or has no data rows')

        const headers = jsonData[0].map((h: any) => String(h ?? '').trim())
        const rawRows = jsonData.slice(1).filter(row => row && row.some(cell => cell !== '' && cell !== null && cell !== undefined))

        resolve({ headers, rawRows })
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Best-effort guess at which file column maps to which expected field,
 * based on common naming variations. Returns -1 for any field it can't
 * confidently match — the UI lets the user fix those manually.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const lower = headers.map(h => h.toLowerCase().trim())
  const find = (fn: (h: string) => boolean) => lower.findIndex(fn)

  return {
    date: find(h => h.includes('date')),
    product_name: find(h => h.includes('product') || h.includes('item') || h === 'name' || h.includes('description')),
    brand: find(h => h.includes('brand') || h.includes('make') || h.includes('manufacturer') || h.includes('company')),
    category: find(h => h.includes('category') || h.includes('type') || h.includes('group')),
    stock_added: find(h =>
      (h.includes('stock') && (h.includes('add') || h.includes('in'))) ||
      h.includes('purchase') ||
      h.includes('received') ||
      h.includes('inward')
    ),
    quantity_sold: find(h =>
      h.includes('sold') ||
      h.includes('sale') ||
      h.includes('outward') ||
      (h.includes('qty') && !h.includes('stock')) ||
      (h.includes('quantity') && !h.includes('stock'))
    ),
  }
}

/**
 * Converts raw rows into ExcelRow[] using a confirmed column mapping.
 * mapping values are column indices into the raw row array, or -1 if
 * that field isn't present in the uploaded file.
 */
export function buildRows(rawRows: any[][], mapping: ColumnMapping): ExcelRow[] {
  const rows: ExcelRow[] = []
  const get = (row: any[], idx: number) => (idx >= 0 ? row[idx] : undefined)

  for (const row of rawRows) {
    const rawDate = get(row, mapping.date)
    let dateStr = format(new Date(), 'yyyy-MM-dd')

    if (rawDate !== undefined && rawDate !== null && rawDate !== '') {
      if (typeof rawDate === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(rawDate)
        if (excelDate) {
          dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
        }
      } else {
        const raw = String(rawDate).trim()
        const parsed = parse(raw, 'dd/MM/yyyy', new Date())
        if (isValid(parsed)) {
          dateStr = format(parsed, 'yyyy-MM-dd')
        } else {
          const parsed2 = parse(raw, 'MM/dd/yyyy', new Date())
          if (isValid(parsed2)) {
            dateStr = format(parsed2, 'yyyy-MM-dd')
          } else {
            const parsed3 = parse(raw, 'yyyy-MM-dd', new Date())
            if (isValid(parsed3)) {
              dateStr = format(parsed3, 'yyyy-MM-dd')
            } else {
              const fallback = new Date(raw)
              if (isValid(fallback)) dateStr = format(fallback, 'yyyy-MM-dd')
            }
          }
        }
      }
    }

    const excelRow: ExcelRow = {
      date: dateStr,
      product_name: String(get(row, mapping.product_name) ?? '').trim(),
      brand: String(get(row, mapping.brand) ?? '').trim(),
      category: String(get(row, mapping.category) ?? '').trim(),
      stock_added: Number(get(row, mapping.stock_added) ?? 0) || 0,
      quantity_sold: Number(get(row, mapping.quantity_sold) ?? 0) || 0,
    }

    if (excelRow.product_name) rows.push(excelRow)
  }

  return rows
}

export function validateExcelRows(rows: ExcelRow[]): { valid: ExcelRow[]; invalid: string[] } {
  const valid: ExcelRow[] = []
  const invalid: string[] = []

  rows.forEach((row, idx) => {
    const lineNum = idx + 2
    if (!row.product_name) { invalid.push(`Row ${lineNum}: Missing product name`); return }
    if (!row.brand) { invalid.push(`Row ${lineNum}: Missing brand for ${row.product_name}`); return }
    if (!row.category) { invalid.push(`Row ${lineNum}: Missing category for ${row.product_name}`); return }
    if (row.stock_added < 0) { invalid.push(`Row ${lineNum}: Negative stock added`); return }
    if (row.quantity_sold < 0) { invalid.push(`Row ${lineNum}: Negative quantity sold`); return }
    valid.push(row)
  })

  return { valid, invalid }
}
