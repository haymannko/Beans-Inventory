import { useState } from 'react'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiDownload,
  FiPrinter,
  FiFileText,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import { useWeightMasterList } from '../hooks/useWeightMaster'
import {
  useBeanRecords,
  useCreateBeanRecord,
  useUpdateBeanRecord,
  useDeleteBeanRecord,
} from '../hooks/useBeanRecords'
import type { CreateBeanRecordRequest } from '../types'

export default function BeanRecords() {
  // Filters
  const [selectedBeanType, setSelectedBeanType] = useState('')
  const [searchCustomer, setSearchCustomer] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateBeanRecordRequest>({
    bean_type_id: '',
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    bags: 0,
    viss: 0,
    price: 0,
  })

  // Queries
  const { data: weightMasterList } = useWeightMasterList()
  const { data: records, isLoading } = useBeanRecords({
    bean_type_id: selectedBeanType || undefined,
    customer: searchCustomer || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  // Mutations
  const createMutation = useCreateBeanRecord()
  const updateMutation = useUpdateBeanRecord()
  const deleteMutation = useDeleteBeanRecord()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync(formData)
      toast.success('Record created successfully')
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      toast.error('Failed to create record')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      await updateMutation.mutateAsync({ id: editingId, data: formData })
      toast.success('Record updated successfully')
      setEditingId(null)
      resetForm()
    } catch (error) {
      toast.error('Failed to update record')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Record deleted successfully')
    } catch (error) {
      toast.error('Failed to delete record')
    }
  }

  const openEditModal = (record: {
    id: string
    bean_type_id: string
    date: string
    customer_name: string
    bags: number
    viss: number
    price: number
  }) => {
    setFormData({
      bean_type_id: record.bean_type_id,
      date: record.date,
      customer_name: record.customer_name,
      bags: record.bags,
      viss: record.viss,
      price: record.price,
    })
    setEditingId(record.id)
  }

  const resetForm = () => {
    setFormData({
      bean_type_id: selectedBeanType || '',
      date: new Date().toISOString().split('T')[0],
      customer_name: '',
      bags: 0,
      viss: 0,
      price: 0,
    })
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleExport = () => {
    if (!records || records.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Date', 'Customer', 'Bags', 'Viss', 'Price', 'Value']
    const rows = records.map((r) => [
      r.date,
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

  const formFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Bean Type *
        </label>
        <select
          value={formData.bean_type_id}
          onChange={(e) => setFormData({ ...formData, bean_type_id: e.target.value })}
          className="input-field"
          required
        >
          <option value="">Select bean type</option>
          {weightMasterList?.map((wm) => (
            <option key={wm.id} value={wm.id}>
              {wm.bean_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date *
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Customer Name *
        </label>
        <input
          type="text"
          value={formData.customer_name}
          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
          className="input-field"
          placeholder="Customer name"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bags (အိတ်) *
          </label>
          <input
            type="number"
            value={formData.bags || ''}
            onChange={(e) => setFormData({ ...formData, bags: Number(e.target.value) })}
            className="input-field"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Viss (ပိဿာ) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.viss || ''}
            onChange={(e) => setFormData({ ...formData, viss: Number(e.target.value) })}
            className="input-field"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price (ဈေးနှုန်း) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="input-field"
            min="0"
            required
          />
        </div>
      </div>
    </>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ပဲစာရင်း</h1>
          <p className="text-gray-500 dark:text-gray-400">Bean Record Management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <FiPrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            New Record
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bean Type
            </label>
            <select
              value={selectedBeanType}
              onChange={(e) => setSelectedBeanType(e.target.value)}
              className="input-field"
            >
              <option value="">All bean types</option>
              {weightMasterList?.map((wm) => (
                <option key={wm.id} value={wm.id}>
                  {wm.bean_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer
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

          <div>
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

          <div>
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

      {/* Data */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : records?.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiFileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No records found
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Bean Type</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header">Bags</th>
                    <th className="table-header">Viss</th>
                    <th className="table-header">Price</th>
                    <th className="table-header">Value</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {records?.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell">{record.date}</td>
                      <td className="table-cell font-medium">{record.bean_type_name}</td>
                      <td className="table-cell">{record.customer_name}</td>
                      <td className="table-cell">{record.bags}</td>
                      <td className="table-cell">{record.viss.toFixed(2)}</td>
                      <td className="table-cell">{record.price.toFixed(2)}</td>
                      <td className="table-cell font-medium">{record.value.toFixed(2)}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {records?.map((record) => (
                <div key={record.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {record.bean_type_name}
                    </span>
                    <span className="text-xs text-gray-500">{record.date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-gray-500">Customer:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {record.customer_name}
                    </span>
                    <span className="text-gray-500">Bags:</span>
                    <span className="text-gray-900 dark:text-gray-100">{record.bags}</span>
                    <span className="text-gray-500">Viss:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {record.viss.toFixed(2)}
                    </span>
                    <span className="text-gray-500">Price:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {record.price.toFixed(2)}
                    </span>
                    <span className="text-gray-500">Value:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {record.value.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openEditModal(record)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FiEdit2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
                    >
                      <FiTrash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Record" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Create Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Record" maxWidth="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setEditingId(null)} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
