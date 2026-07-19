import { useState, useEffect, useMemo } from 'react'
import {
  FiPlus,
  FiTrash2,
  FiSearch,
  FiDownload,
  FiPrinter,
  FiFileText,
  FiSave,
  FiX,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useWeightMasterList } from '../hooks/useWeightMaster'
import {
  useBeanRecords,
  useCreateBeanRecord,
  useDeleteBeanRecord,
} from '../hooks/useBeanRecords'

interface EditableRow {
  tempId: string
  bean_type_id: string
  date: string
  customer_name: string
  bags: number
  viss: number
  price: number
  value: number
}

function createEmptyRow(beanTypeId: string, date: string): EditableRow {
  return {
    tempId: `new-${Date.now()}-${Math.random()}`,
    bean_type_id: beanTypeId,
    date,
    customer_name: '',
    bags: 0,
    viss: 0,
    price: 0,
    value: 0,
  }
}

// Same formula as backend: ((bean_weight / 2) * bags + viss) * price / bean_weight
function calculateValue(beanWeight: number, bags: number, viss: number, price: number): number {
  if (beanWeight <= 0 || price <= 0) return 0
  return ((beanWeight / 2) * bags + viss) * price / beanWeight
}

// Safely evaluate simple math expressions like "3558-3504", "10+4", "10-4+2"
function evalMath(expr: string): number {
  const cleaned = expr.replace(/\s/g, '')
  if (!/^[0-9]+\.?[0-9]*([+\-][0-9]+\.?[0-9]*)+$/.test(cleaned)) return NaN
  const result = new Function(`return (${cleaned})`)()
  return typeof result === 'number' && isFinite(result) ? result : NaN
}

// Parse input value: if it contains math ops, evaluate; otherwise return the number
function parseInputValue(raw: string): number {
  if (raw === '' || raw === '-') return 0
  const num = Number(raw)
  if (!isNaN(num)) return num
  const result = evalMath(raw)
  return isNaN(result) ? 0 : result
}

function formatNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function BeanRecords() {
  // Active bean type tab - persisted to localStorage
  const [activeBeanType, setActiveBeanType] = useState(() => {
    return localStorage.getItem('beanRecords_activeTab') || ''
  })

  // Shared defaults for new rows
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0])

  // Starting balance (persisted per bean type)
  const [startBags, setStartBags] = useState<number>(() => {
    try {
      const activeTab = localStorage.getItem('beanRecords_activeTab') || ''
      return Number(localStorage.getItem(`beanRecords_startBags_${activeTab}`)) || 0
    } catch { return 0 }
  })
  const [startViss, setStartViss] = useState<number>(() => {
    try {
      const activeTab = localStorage.getItem('beanRecords_activeTab') || ''
      return Number(localStorage.getItem(`beanRecords_startViss_${activeTab}`)) || 0
    } catch { return 0 }
  })
  const [startValue, setStartValue] = useState<number>(() => {
    try {
      const activeTab = localStorage.getItem('beanRecords_activeTab') || ''
      return Number(localStorage.getItem(`beanRecords_startValue_${activeTab}`)) || 0
    } catch { return 0 }
  })

  // Filters
  const [searchCustomer, setSearchCustomer] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Editable rows (unsaved new rows) - persisted to localStorage per bean type
  const [editingRows, setEditingRows] = useState<EditableRow[]>(() => {
    try {
      const activeTab = localStorage.getItem('beanRecords_activeTab') || ''
      const saved = localStorage.getItem(`beanRecords_editingRows_${activeTab}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('beanRecords_activeTab', activeBeanType)
  }, [activeBeanType])

  // Save editing rows to localStorage whenever they change (per bean type)
  useEffect(() => {
    localStorage.setItem(`beanRecords_editingRows_${activeBeanType}`, JSON.stringify(editingRows))
  }, [editingRows, activeBeanType])

  // Save starting balance
  useEffect(() => { localStorage.setItem(`beanRecords_startBags_${activeBeanType}`, String(startBags)) }, [startBags, activeBeanType])
  useEffect(() => { localStorage.setItem(`beanRecords_startViss_${activeBeanType}`, String(startViss)) }, [startViss, activeBeanType])
  useEffect(() => { localStorage.setItem(`beanRecords_startValue_${activeBeanType}`, String(startValue)) }, [startValue, activeBeanType])

  // Queries
  const { data: weightMasterList } = useWeightMasterList()
  const { data: records, isLoading } = useBeanRecords({
    bean_type_id: activeBeanType || undefined,
    customer: searchCustomer || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  // Mutations
  const createMutation = useCreateBeanRecord()
  const deleteMutation = useDeleteBeanRecord()

  // Sort records by date ascending for running balance
  const sortedRecords = useMemo(() => {
    if (!records) return []
    return [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [records])

  // Calculate running balances
  const ledgerData = useMemo(() => {
    let balBags = startBags
    let balViss = startViss
    let balValue = startValue

    const wm = weightMasterList?.find(w => w.id === activeBeanType)
    const beanWeight = wm?.weight || 55.25

    const rows: Array<{
      type: 'saved' | 'editing'
      id: string
      date: string
      customer_name: string
      bags: number
      viss: number
      price: number
      value: number
      balBags: number
      balViss: number
      balValue: number
      original?: any
    }> = []

    // Saved records first — negate bags/viss (sales = outgoing stock)
    for (const rec of sortedRecords) {
      const negBags = -Math.abs(rec.bags)
      const negViss = -Math.abs(rec.viss)
      const negValue = -Math.abs(rec.value)
      balBags += negBags
      balViss += negViss
      balValue += negValue
      rows.push({
        type: 'saved',
        id: rec.id,
        date: rec.date,
        customer_name: rec.customer_name,
        bags: negBags,
        viss: negViss,
        price: rec.price,
        value: negValue,
        balBags,
        balViss,
        balValue,
        original: rec,
      })
    }

    // Editing rows (unsaved) at the end — also subtract (sales)
    for (const row of editingRows) {
      const computedValue = row.price > 0 ? calculateValue(beanWeight, row.bags, row.viss, row.price) : row.value
      const negBags = -Math.abs(row.bags)
      const negViss = -Math.abs(row.viss)
      const negValue = -Math.abs(computedValue)
      balBags += negBags
      balViss += negViss
      balValue += negValue
      rows.push({
        type: 'editing',
        id: row.tempId,
        date: row.date,
        customer_name: row.customer_name,
        bags: negBags,
        viss: negViss,
        price: row.price,
        value: negValue,
        balBags,
        balViss,
        balValue,
      })
    }

    return rows
  }, [sortedRecords, editingRows, startBags, startViss, startValue, weightMasterList, activeBeanType])

  const switchTab = (newTab: string) => {
    // Save current rows before switching
    localStorage.setItem(`beanRecords_editingRows_${activeBeanType}`, JSON.stringify(editingRows))
    // Load rows for the new tab
    try {
      const saved = localStorage.getItem(`beanRecords_editingRows_${newTab}`)
      setEditingRows(saved ? JSON.parse(saved) : [])
    } catch {
      setEditingRows([])
    }
    // Load starting balance for the new tab
    setStartBags(Number(localStorage.getItem(`beanRecords_startBags_${newTab}`)) || 0)
    setStartViss(Number(localStorage.getItem(`beanRecords_startViss_${newTab}`)) || 0)
    setStartValue(Number(localStorage.getItem(`beanRecords_startValue_${newTab}`)) || 0)
    setActiveBeanType(newTab)
  }

  const addNewRow = () => {
    const row = createEmptyRow(activeBeanType, defaultDate)
    setEditingRows((prev) => [...prev, row])
  }

  const removeNewRow = (tempId: string) => {
    setEditingRows((prev) => prev.filter((r) => r.tempId !== tempId))
  }

  const updateNewRow = (tempId: string, field: keyof EditableRow, value: string | number) => {
    setEditingRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    )
  }

  const saveNewRow = async (row: EditableRow) => {
    if (!row.bean_type_id) {
      toast.error('Please select a bean type')
      return
    }
    if (!row.customer_name.trim()) {
      toast.error('Please enter customer name')
      return
    }
    try {
      const wm = weightMasterList?.find(w => w.id === row.bean_type_id)
      const beanWeight = wm?.weight || 55.25
      const computedValue = row.price > 0 ? calculateValue(beanWeight, row.bags, row.viss, row.price) : row.value

      await createMutation.mutateAsync({
        bean_type_id: row.bean_type_id,
        date: row.date,
        customer_name: row.customer_name,
        bags: row.bags,
        viss: row.viss,
        price: row.price,
        value: row.price > 0 ? undefined : computedValue,
      })
      toast.success('Record saved')
      setEditingRows((prev) => prev.filter((r) => r.tempId !== row.tempId))
    } catch {
      toast.error('Failed to save record')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Record deleted')
    } catch {
      toast.error('Failed to delete record')
    }
  }

  const handleExport = () => {
    const headers = ['Date', 'Customer', 'Bags', 'Viss', 'Price', 'Value', 'Balance Bags', 'Balance Viss', 'Balance Value']
    const rows = ledgerData.map((r) => [
      r.date,
      r.customer_name,
      r.bags,
      r.viss,
      r.price,
      r.value.toFixed(2),
      r.balBags,
      r.balViss.toFixed(2),
      r.balValue.toFixed(2),
    ])
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bean-records-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported successfully')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ပဲစာရင်း</h1>
          <p className="text-gray-500 dark:text-gray-400">Bean Record Ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center justify-center gap-2">
            <FiPrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center justify-center gap-2">
            <FiDownload className="w-4 h-4" /> Export
          </button>
          <button onClick={addNewRow} className="btn-primary flex items-center justify-center gap-2">
            <FiPlus className="w-4 h-4" /> New Record
          </button>
        </div>
      </div>

      {/* Bean Type Tabs */}
      <div className="card p-2 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => switchTab('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeBeanType === ''
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Choose Bean Type
          </button>
          {weightMasterList?.map((wm) => (
            <button
              key={wm.id}
              onClick={() => switchTab(wm.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeBeanType === wm.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {wm.bean_name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Choose ကုန်အမျိုးအမည် (for page)
            </label>
            <select
              value={activeBeanType}
              onChange={(e) => switchTab(e.target.value)}
              className="input-field"
            >
              <option value="">Select bean type</option>
              {weightMasterList?.map((wm) => (
                <option key={wm.id} value={wm.id}>{wm.bean_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Date (for new rows)
            </label>
            <input
              type="date"
              value={defaultDate}
              onChange={(e) => setDefaultDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Customer
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="input-field pl-10"
                placeholder="Search customer..."
              />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Excel-like Ledger Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="table-header min-w-[100px]">နေ့စွဲ</th>
                <th className="table-header min-w-[120px]">အမည်</th>
                <th className="table-header min-w-[80px] text-right bg-red-50 dark:bg-red-900/20">အိတ်</th>
                <th className="table-header min-w-[80px] text-right bg-red-50 dark:bg-red-900/20">ပိဿာ</th>
                <th className="table-header min-w-[100px] text-right">ဈေးနှုန်း</th>
                <th className="table-header min-w-[120px] text-right">တန်ဘိုး</th>
                <th className="table-header min-w-[80px] text-right bg-green-50 dark:bg-green-900/20">လက်ကျန်အိတ်</th>
                <th className="table-header min-w-[80px] text-right bg-green-50 dark:bg-green-900/20">လက်ကျန်ပိဿာ</th>
                <th className="table-header min-w-[120px] text-right bg-green-50 dark:bg-green-900/20">လက်ကျန်တန်ဘိုး</th>
                <th className="table-header text-right min-w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Starting Balance Row */}
              <tr className="bg-blue-50 dark:bg-blue-900/20 font-medium">
                <td className="table-cell text-blue-700 dark:text-blue-300" colSpan={2}>
                  စတင်ဘဏ္ဍာ (Starting Balance)
                </td>
                <td className="table-cell px-1">
                  <input
                    type="number"
                    value={startBags || ''}
                    onChange={(e) => setStartBags(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </td>
                <td className="table-cell px-1">
                  <input
                    type="number"
                    step="0.01"
                    value={startViss || ''}
                    onChange={(e) => setStartViss(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </td>
                <td className="table-cell"></td>
                <td className="table-cell px-1">
                  <input
                    type="number"
                    step="0.01"
                    value={startValue || ''}
                    onChange={(e) => setStartValue(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </td>
                <td className="table-cell text-right font-bold text-blue-700 dark:text-blue-300">
                  {formatNum(startBags)}
                </td>
                <td className="table-cell text-right font-bold text-blue-700 dark:text-blue-300">
                  {formatNum(startViss)}
                </td>
                <td className="table-cell text-right font-bold text-blue-700 dark:text-blue-300">
                  {formatNum(startValue)}
                </td>
                <td className="table-cell"></td>
              </tr>

              {/* Ledger rows */}
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : ledgerData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    <FiFileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    No records found. Click "New Record" to add one.
                  </td>
                </tr>
              ) : (
                ledgerData.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.type === 'editing'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  >
                    {/* Date */}
                    <td className="table-cell px-1">
                      {row.type === 'editing' ? (
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateNewRow(row.id, 'date', e.target.value)}
                          className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span>{row.date}</span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="table-cell px-1">
                      {row.type === 'editing' ? (
                        <input
                          type="text"
                          value={row.customer_name}
                          onChange={(e) => updateNewRow(row.id, 'customer_name', e.target.value)}
                          className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Customer"
                        />
                      ) : (
                        <span>{row.customer_name}</span>
                      )}
                    </td>

                    {/* Bags (in/out) */}
                    <td className="table-cell px-1 text-right">
                      {row.type === 'editing' ? (
                        <input
                          type="number"
                          value={row.bags || ''}
                          onBlur={(e) => updateNewRow(row.id, 'bags', parseInputValue(e.target.value))}
                          onChange={(e) => updateNewRow(row.id, 'bags', parseInputValue(e.target.value))}
                          className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className={row.bags < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {row.bags > 0 ? '+' : ''}{row.bags}
                        </span>
                      )}
                    </td>

                    {/* Viss (in/out) */}
                    <td className="table-cell px-1 text-right">
                      {row.type === 'editing' ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.viss || ''}
                          onBlur={(e) => updateNewRow(row.id, 'viss', parseInputValue(e.target.value))}
                          onChange={(e) => updateNewRow(row.id, 'viss', parseInputValue(e.target.value))}
                          className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className={row.viss < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {row.viss > 0 ? '+' : ''}{row.viss.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="table-cell px-1 text-right">
                      {row.type === 'editing' ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.price || ''}
                          onBlur={(e) => updateNewRow(row.id, 'price', parseInputValue(e.target.value))}
                          onChange={(e) => updateNewRow(row.id, 'price', parseInputValue(e.target.value))}
                          className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span>{row.price > 0 ? formatNum(row.price) : ''}</span>
                      )}
                    </td>

                    {/* Value */}
                    <td className="table-cell px-1 text-right font-medium">
                      {row.type === 'editing' ? (
                        row.price > 0 ? (
                          <span className="text-sm text-green-600 dark:text-green-400 px-2">
                            {formatNum(row.value)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={row.value || ''}
                            onChange={(e) => updateNewRow(row.id, 'value', Number(e.target.value))}
                            className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter value"
                          />
                        )
                      ) : (
                        <span className={row.value < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                          {row.value !== 0 ? formatNum(row.value) : ''}
                        </span>
                      )}
                    </td>

                    {/* Balance Bags */}
                    <td className="table-cell px-1 text-right font-bold bg-green-50/50 dark:bg-green-900/10">
                      {formatNum(row.balBags)}
                    </td>

                    {/* Balance Viss */}
                    <td className="table-cell px-1 text-right font-bold bg-green-50/50 dark:bg-green-900/10">
                      {formatNum(row.balViss)}
                    </td>

                    {/* Balance Value */}
                    <td className="table-cell px-1 text-right font-bold bg-green-50/50 dark:bg-green-900/10">
                      {formatNum(row.balValue)}
                    </td>

                    {/* Actions */}
                    <td className="table-cell text-right">
                      {row.type === 'editing' ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              const editRow = editingRows.find(r => r.tempId === row.id)
                              if (editRow) saveNewRow(editRow)
                            }}
                            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                            title="Save"
                          >
                            <FiSave className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeNewRow(row.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            title="Cancel"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}

              {/* Grand Total Row */}
              {ledgerData.length > 0 && (
                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="table-cell" colSpan={6}>
                    စုစုပေါင်း (Total)
                  </td>
                  <td className="table-cell text-right text-green-700 dark:text-green-300">
                    {formatNum(ledgerData[ledgerData.length - 1]?.balBags || startBags)}
                  </td>
                  <td className="table-cell text-right text-green-700 dark:text-green-300">
                    {formatNum(ledgerData[ledgerData.length - 1]?.balViss || startViss)}
                  </td>
                  <td className="table-cell text-right text-green-700 dark:text-green-300">
                    {formatNum(ledgerData[ledgerData.length - 1]?.balValue || startValue)}
                  </td>
                  <td className="table-cell"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
