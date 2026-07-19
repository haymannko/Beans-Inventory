import { useState, useEffect } from 'react'
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

// Safely evaluate simple math expressions like "3558-3504", "10+4", "20*3", "100/5"
function evalMath(expr: string): number {
  const cleaned = expr.replace(/\s/g, '')
  // Match: number operator number (supports chained: 10-4-2)
  if (!/^[0-9]+\.?[0-9]*([+\-*/][0-9]+\.?[0-9]*)+$/.test(cleaned)) return NaN
  // Use Function constructor (safe: only digits and operators allowed by regex above)
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

export default function BeanRecords() {
  // Active bean type tab - persisted to localStorage
  const [activeBeanType, setActiveBeanType] = useState(() => {
    return localStorage.getItem('beanRecords_activeTab') || ''
  })

  // Shared defaults for new rows
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0])

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
      await createMutation.mutateAsync({
        bean_type_id: row.bean_type_id,
        date: row.date,
        customer_name: row.customer_name,
        bags: row.bags,
        viss: row.viss,
        price: row.price,
        value: row.price > 0 ? undefined : row.value,
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
    if (!records || records.length === 0) {
      toast.error('No data to export')
      return
    }
    const headers = ['Date', 'Bean Type', 'Customer', 'Bags', 'Viss', 'Price', 'Value']
    const rows = records.map((r) => [
      r.date,
      r.bean_type_name || '',
      r.customer_name,
      r.bags,
      r.viss,
      r.price,
      r.value,
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
          <p className="text-gray-500 dark:text-gray-400">Bean Record Management</p>
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

      {/* Data Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">နေ့စွဲ</th>
                <th className="table-header">ကုန်အမျိုးအမည်</th>
                <th className="table-header">အမည်</th>
                <th className="table-header">အိတ်</th>
                <th className="table-header">ပိဿာ</th>
                <th className="table-header">ဈေးနှုန်း</th>
                <th className="table-header">တန်ဘိုး</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Editable new rows */}
              {editingRows.map((row) => (
                <tr key={row.tempId} className="bg-yellow-50 dark:bg-yellow-900/10">
                  <td className="table-cell px-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateNewRow(row.tempId, 'date', e.target.value)}
                      className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="table-cell px-1">
                    <select
                      value={row.bean_type_id}
                      onChange={(e) => updateNewRow(row.tempId, 'bean_type_id', e.target.value)}
                      className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      {weightMasterList?.map((wm) => (
                        <option key={wm.id} value={wm.id}>{wm.bean_name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell px-1">
                    <input
                      type="text"
                      value={row.customer_name}
                      onChange={(e) => updateNewRow(row.tempId, 'customer_name', e.target.value)}
                      className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Customer"
                    />
                  </td>
                  <td className="table-cell px-1">
                    <input
                      type="number"
                      value={row.bags || ''}
                      onBlur={(e) => updateNewRow(row.tempId, 'bags', parseInputValue(e.target.value))}
                      onChange={(e) => updateNewRow(row.tempId, 'bags', parseInputValue(e.target.value))}
                      className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </td>
                  <td className="table-cell px-1">
                    <input
                      type="number"
                      step="0.01"
                      value={row.viss || ''}
                      onBlur={(e) => updateNewRow(row.tempId, 'viss', parseInputValue(e.target.value))}
                      onChange={(e) => updateNewRow(row.tempId, 'viss', parseInputValue(e.target.value))}
                      className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </td>
                  <td className="table-cell px-1">
                    <input
                      type="number"
                      step="0.01"
                      value={row.price || ''}
                      onBlur={(e) => updateNewRow(row.tempId, 'price', parseInputValue(e.target.value))}
                      onChange={(e) => updateNewRow(row.tempId, 'price', parseInputValue(e.target.value))}
                      className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </td>
                  <td className="table-cell px-1">
                    {row.price > 0 ? (() => {
                      const wm = weightMasterList?.find(w => w.id === row.bean_type_id)
                      if (!wm) {
                        // Weight master not loaded yet — show manual input as fallback
                        return (
                          <input
                            type="number"
                            step="0.01"
                            value={row.value || ''}
                            onChange={(e) => updateNewRow(row.tempId, 'value', Number(e.target.value))}
                            className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            placeholder="Enter value"
                          />
                        )
                      }
                      const computed = calculateValue(wm.weight, row.bags, row.viss, row.price)
                      return (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400 px-2">
                          {computed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )
                    })() : (
                      <input
                        type="number"
                        step="0.01"
                        value={row.value || ''}
                        onChange={(e) => updateNewRow(row.tempId, 'value', Number(e.target.value))}
                        className="w-full bg-transparent border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="Enter value"
                      />
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => saveNewRow(row)}
                        className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                        title="Save"
                      >
                        <FiSave className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeNewRow(row.tempId)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        title="Cancel"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Saved records */}
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : records?.length === 0 && editingRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    <FiFileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    No records found. Click "New Record" to add one.
                  </td>
                </tr>
              ) : (
                records?.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="table-cell">{record.date}</td>
                    <td className="table-cell font-medium">{record.bean_type_name}</td>
                    <td className="table-cell">{record.customer_name}</td>
                    <td className="table-cell text-right">{record.bags}</td>
                    <td className="table-cell text-right">{record.viss.toFixed(2)}</td>
                    <td className="table-cell text-right">{record.price.toFixed(2)}</td>
                    <td className="table-cell text-right font-medium">{record.value.toFixed(2)}</td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
