import * as XLSX from 'xlsx'
import { ExcelRow } from '../types'
import { format, parse, isValid } from 'date-fns'

export function parseExcelFile(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) throw new Error('Excel file is empty or has no data rows')

        const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim())
        const rows: ExcelRow[] = []

        const colMap = {
          date: headers.findIndex(h => h.includes('date')),
          product_name: headers.findIndex(h => h.includes('product')),
          brand: headers.findIndex(h => h.includes('brand')),
          category: headers.findIndex(h => h.includes('category')),
          stock_added: headers.findIndex(h => h.includes('stock') && h.includes('add')),
          quantity_sold: headers.findIndex(h => h.includes('sold') || (h.includes('quantity') && !h.includes('stock'))),
        }

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const rawDate = row[colMap.date]
          let dateStr = format(new Date(), 'yyyy-MM-dd')

          if (rawDate) {
            if (typeof rawDate === 'number') {
              const excelDate = XLSX.SSF.parse_date_code(rawDate)
              if (excelDate) {
                dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
              }
            } else {
              const parsed = parse(String(rawDate), 'dd/MM/yyyy', new Date())
              if (isValid(parsed)) dateStr = format(parsed, 'yyyy-MM-dd')
              else {
                const parsed2 = parse(String(rawDate), 'MM/dd/yyyy', new Date())
                if (isValid(parsed2)) dateStr = format(parsed2, 'yyyy-MM-dd')
              }
            }
          }

          const excelRow: ExcelRow = {
            date: dateStr,
            product_name: String(row[colMap.product_name] || '').trim(),
            brand: String(row[colMap.brand] || '').trim(),
            category: String(row[colMap.category] || '').trim(),
            stock_added: Number(row[colMap.stock_added] || 0),
            quantity_sold: Number(row[colMap.quantity_sold] || 0),
          }

          if (excelRow.product_name) rows.push(excelRow)
        }

        resolve(rows)
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse Excel file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
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
