import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, Loader2, Settings2 } from 'lucide-react'
import {
  readFile,
  autoDetectMapping,
  buildRows,
  validateExcelRows,
  ColumnMapping,
  FixedValues,
  FIELD_LABELS,
  REQUIRED_FIELDS,
} from '../../utils/excelParser'
import { importExcelData } from '../../utils/excelImporter'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ExcelRow } from '../../types'

type UploadState = 'idle' | 'parsing' | 'mapping' | 'preview' | 'importing' | 'done' | 'error'

const FIELD_ORDER: (keyof ColumnMapping)[] = ['date', 'product_name', 'brand', 'category', 'stock_added', 'quantity_sold']

export default function UploadExcel() {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<any[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [fixedValues, setFixedValues] = useState<FixedValues>({})
  const [validRows, setValidRows] = useState<ExcelRow[]>([])
  const [invalidMessages, setInvalidMessages] = useState<string[]>([])
  const [result, setResult] = useState<{ processed: number; failed: number; errors: string[] } | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file')
      return
    }

    setFileName(file.name)
    setState('parsing')
    setError('')

    try {
      const { headers: fileHeaders, rawRows: fileRows } = await readFile(file)
      const guessedMapping = autoDetectMapping(fileHeaders)
      setHeaders(fileHeaders)
      setRawRows(fileRows)
      setMapping(guessedMapping)
      setState('mapping')
    } catch (err: any) {
      setError(err.message)
      setState('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function updateMapping(field: keyof ColumnMapping, columnIndex: number) {
    if (!mapping) return
    setMapping({ ...mapping, [field]: columnIndex })
  }

  function confirmMapping() {
    if (!mapping) return
    const rows = buildRows(rawRows, mapping, fixedValues)
    const { valid, invalid } = validateExcelRows(rows)
    setValidRows(valid)
    setInvalidMessages(invalid)
    setState('preview')
  }

  const mappingIsComplete = mapping ? REQUIRED_FIELDS.every(f => mapping[f] >= 0) : false

  async function handleImport() {
    if (!user || validRows.length === 0) return
    setState('importing')

    try {
      const { data: uploadRecord, error } = await supabase
        .from('excel_uploads')
        .insert({
          file_name: fileName,
          uploaded_by: user.id,
          status: 'processing',
          rows_processed: 0,
          rows_failed: 0,
        })
        .select('id')
        .single()

      if (error || !uploadRecord) throw new Error('Failed to create upload record')

      const importResult = await importExcelData(validRows, user.id, uploadRecord.id)
      setResult(importResult)
      setState('done')
    } catch (err: any) {
      setError(err.message)
      setState('error')
    }
  }

  function reset() {
    setState('idle')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setMapping(null)
    setFixedValues({})
    setValidRows([])
    setInvalidMessages([])
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const headers = ['Date', 'Product Name', 'Brand', 'Category', 'Stock Added', 'Quantity Sold']
    const sample = [
      ['01/01/2025', 'Sample Wire 6mm', 'Finolex', 'Wires', '100', '10'],
      ['01/01/2025', 'MCB 32A', 'Havells', 'MCB', '50', '5'],
    ]
    const csv = [headers, ...sample].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = 'inventory_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Upload Excel</h2>
          <p className="text-slate-500 text-sm">Import inventory and sales data from any spreadsheet format</p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary">
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Expected format */}
      {(state === 'idle' || state === 'error') && (
        <div className="card p-4">
          <p className="text-slate-400 text-sm font-medium mb-2">Fields We Import</p>
          <div className="flex flex-wrap gap-2">
            {['Date', 'Product Name', 'Brand', 'Category', 'Stock Added', 'Quantity Sold'].map(col => (
              <span key={col} className="px-2.5 py-1 bg-slate-800 rounded-md text-slate-300 text-xs font-mono border border-slate-700">{col}</span>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-2">
            Your file's column names and order don't need to match exactly — after upload, you'll be able to map
            your own columns to these fields.
          </p>
        </div>
      )}

      {/* Upload area */}
      {(state === 'idle' || state === 'error') && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
          }`}
        >
          <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium mb-1">Drop your file here or click to browse</p>
          <p className="text-slate-500 text-sm">Supports .xlsx, .xls, .csv — any column layout</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Error</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Parsing state */}
      {state === 'parsing' && (
        <div className="card p-8 text-center">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300">Reading {fileName}...</p>
        </div>
      )}

      {/* Column mapping */}
      {state === 'mapping' && mapping && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-brand-400" />
            <p className="text-slate-300 font-medium">Match your columns</p>
          </div>
          <p className="text-slate-500 text-sm -mt-2">
            We found {headers.length} column{headers.length === 1 ? '' : 's'} in <span className="text-slate-400">{fileName}</span>.
            We've guessed the best match for each field below — check and adjust anything that's wrong.
          </p>

          <div className="card divide-y divide-slate-800">
            {FIELD_ORDER.map(field => {
              const isFallbackField = field === 'brand' || field === 'category'
              const columnNotMapped = mapping[field] === -1
              return (
                <div key={field} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{FIELD_LABELS[field]}</p>
                      {REQUIRED_FIELDS.includes(field) ? (
                        <p className="text-red-400/80 text-xs">Required</p>
                      ) : field === 'date' ? (
                        <p className="text-slate-600 text-xs">Optional — defaults to today if not mapped</p>
                      ) : isFallbackField ? (
                        <p className="text-slate-600 text-xs">Optional — not every file has this as its own column</p>
                      ) : (
                        <p className="text-slate-600 text-xs">Optional — defaults to 0 if not mapped</p>
                      )}
                    </div>
                    <select
                      value={mapping[field]}
                      onChange={e => updateMapping(field, Number(e.target.value))}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 min-w-[200px]"
                    >
                      <option value={-1}>-- Not in file --</option>
                      {headers.map((h, idx) => (
                        <option key={idx} value={idx}>{h || `Column ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  {isFallbackField && columnNotMapped && (
                    <input
                      type="text"
                      value={fixedValues[field] || ''}
                      onChange={e => setFixedValues({ ...fixedValues, [field]: e.target.value })}
                      placeholder={`No ${FIELD_LABELS[field]} column? Type one value to use for every row, e.g. "${field === 'brand' ? 'Unbranded' : 'General'}"`}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {!mappingIsComplete && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs">Please map Product Name, Brand, and Category before continuing — these are required.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary">Cancel</button>
            <button onClick={confirmMapping} disabled={!mappingIsComplete} className="btn-primary">
              Continue to Preview
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {state === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 badge-green px-3 py-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{validRows.length} valid rows</span>
            </div>
            {invalidMessages.length > 0 && (
              <div className="flex items-center gap-2 badge-red px-3 py-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">{invalidMessages.length} invalid rows</span>
              </div>
            )}
            <span className="text-slate-500 text-sm">{fileName}</span>
            <button onClick={() => setState('mapping')} className="text-brand-400 text-xs underline ml-auto">
              Edit column mapping
            </button>
          </div>

          {invalidMessages.length > 0 && (
            <div className="card p-4">
              <p className="text-amber-400 text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Validation Warnings
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {invalidMessages.map((msg, i) => (
                  <p key={i} className="text-slate-500 text-xs">{msg}</p>
                ))}
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Date', 'Product Name', 'Brand', 'Category', 'Stock Added', 'Qty Sold'].map(h => (
                      <th key={h} className="text-left p-3 table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="table-row">
                      <td className="p-3 text-slate-500 text-xs font-mono">{row.date}</td>
                      <td className="p-3 text-slate-200">{row.product_name}</td>
                      <td className="p-3 text-slate-400">{row.brand}</td>
                      <td className="p-3 text-slate-400">{row.category}</td>
                      <td className="p-3 text-emerald-400 font-mono">{row.stock_added}</td>
                      <td className="p-3 text-blue-400 font-mono">{row.quantity_sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {validRows.length > 10 && (
              <div className="p-3 border-t border-slate-800 text-center">
                <p className="text-slate-500 text-xs">Showing 10 of {validRows.length} rows</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary">Cancel</button>
            <button onClick={handleImport} disabled={validRows.length === 0} className="btn-primary">
              <Upload className="w-4 h-4" />
              Import {validRows.length} Rows
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {state === 'importing' && (
        <div className="card p-10 text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-white font-semibold">Importing data...</p>
          <p className="text-slate-500 text-sm mt-1">Please do not close this window</p>
        </div>
      )}

      {/* Done */}
      {state === 'done' && result && (
        <div className="space-y-4">
          <div className="card p-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-display font-bold text-white text-lg mb-1">Import Complete!</h3>
            <p className="text-slate-400 text-sm">Successfully imported {result.processed} of {result.processed + result.failed} rows</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 text-center">
              <p className="font-display font-bold text-emerald-400 text-2xl">{result.processed}</p>
              <p className="text-slate-500 text-sm mt-1">Rows Processed</p>
            </div>
            <div className="card p-4 text-center">
              <p className={`font-display font-bold text-2xl ${result.failed > 0 ? 'text-red-400' : 'text-slate-500'}`}>{result.failed}</p>
              <p className="text-slate-500 text-sm mt-1">Rows Failed</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="card p-4">
              <p className="text-red-400 text-sm font-medium mb-2">Errors</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => <p key={i} className="text-slate-500 text-xs">{e}</p>)}
              </div>
            </div>
          )}

          <button onClick={reset} className="btn-primary">
            <Upload className="w-4 h-4" />
            Upload Another File
          </button>
        </div>
      )}
    </div>
  )
}
