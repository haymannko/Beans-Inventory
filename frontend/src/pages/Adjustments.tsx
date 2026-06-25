import { useState } from 'react'
import { useAdjustments, useCreateAdjustment, useUpdateAdjustment, useDeleteAdjustment } from '../hooks/useAdjustments'
import { useBeanTypes } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiSliders, FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { StockAdjustment } from '../types'

export default function Adjustments() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    bean_type_id: '',
    quantity: '',
    adjustment_type: 'increase' as 'increase' | 'decrease',
    reason: '',
    adjustment_date: new Date().toISOString().split('T')[0],
  })

  const { data: adjustments, isLoading } = useAdjustments()
  const { data: beanTypes } = useBeanTypes()
  const createMutation = useCreateAdjustment()
  const updateMutation = useUpdateAdjustment()
  const deleteMutation = useDeleteAdjustment()

  const resetForm = () => {
    setFormData({
      bean_type_id: '',
      quantity: '',
      adjustment_type: 'increase',
      reason: '',
      adjustment_date: new Date().toISOString().split('T')[0],
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this adjustment record?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Adjustment deleted successfully')
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
          : 'Failed to delete'
      toast.error(message)
    }
  }

  const openEditModal = (adj: StockAdjustment) => {
    setEditingId(adj.id)
    setFormData({
      bean_type_id: adj.bean_type_id,
      quantity: String(adj.quantity),
      adjustment_type: adj.adjustment_type as 'increase' | 'decrease',
      reason: adj.reason,
      adjustment_date: adj.adjustment_date,
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        bean_type_id: formData.bean_type_id,
        quantity: parseFloat(formData.quantity),
        adjustment_type: formData.adjustment_type,
        reason: formData.reason,
        adjustment_date: formData.adjustment_date,
      })
      toast.success('Stock adjustment recorded successfully')
      setIsModalOpen(false)
      resetForm()
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to record adjustment'
          : 'Failed to record adjustment'
      toast.error(message)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          bean_type_id: formData.bean_type_id,
          quantity: parseFloat(formData.quantity),
          adjustment_type: formData.adjustment_type,
          reason: formData.reason,
          adjustment_date: formData.adjustment_date,
        },
      })
      toast.success('Adjustment updated successfully')
      setEditingId(null)
      resetForm()
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to update'
          : 'Failed to update'
      toast.error(message)
    }
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {beanTypes?.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Adjustment Date *
          </label>
          <input
            type="date"
            value={formData.adjustment_date}
            onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Adjustment Type *
          </label>
          <select
            value={formData.adjustment_type}
            onChange={(e) =>
              setFormData({ ...formData, adjustment_type: e.target.value as 'increase' | 'decrease' })
            }
            className="input-field"
            required
          >
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weight (Viss) *
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="input-field"
            min="0.01"
            step="0.01"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reason *
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="input-field"
          rows={2}
          required
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Adjustments</h1>
          <p className="text-gray-500 dark:text-gray-400">Correct stock levels with audit trail</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-4 h-4" />
          New Adjustment
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Bean Type</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Weight (Viss)</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {adjustments?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <FiSliders className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      No adjustments recorded
                    </td>
                  </tr>
                ) : (
                  adjustments?.map((adj) => (
                    <tr key={adj.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell">{adj.adjustment_date}</td>
                      <td className="table-cell font-medium">{adj.bean_type_name}</td>
                      <td className="table-cell">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            adj.adjustment_type === 'increase'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {adj.adjustment_type}
                        </span>
                      </td>
                      <td className="table-cell">{adj.quantity.toFixed(2)}</td>
                      <td className="table-cell text-gray-500">{adj.reason}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(adj)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(adj.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Stock Adjustment" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Record Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Stock Adjustment" maxWidth="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formFields}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
