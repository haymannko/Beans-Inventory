import { useState } from 'react'
import { useArrivals, useCreateArrival, useUpdateArrival, useDeleteArrival } from '../hooks/useArrivals'
import { useBeanTypes } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiTruck, FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Arrival } from '../types'

export default function Arrivals() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    bean_type_id: '',
    quantity_bags: '',
    weight_kg: '',
    supplier_name: '',
    purchase_price: '',
    arrival_date: new Date().toISOString().split('T')[0],
    remarks: '',
  })

  const { data: arrivals, isLoading } = useArrivals()
  const { data: beanTypes } = useBeanTypes()
  const createMutation = useCreateArrival()
  const updateMutation = useUpdateArrival()
  const deleteMutation = useDeleteArrival()

  const resetForm = () => {
    setFormData({
      bean_type_id: '',
      quantity_bags: '',
      weight_kg: '',
      supplier_name: '',
      purchase_price: '',
      arrival_date: new Date().toISOString().split('T')[0],
      remarks: '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this arrival record?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Arrival deleted successfully')
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
          : 'Failed to delete'
      toast.error(message)
    }
  }

  const openEditModal = (arrival: Arrival) => {
    setEditingId(arrival.id)
    setFormData({
      bean_type_id: arrival.bean_type_id,
      quantity_bags: String(arrival.quantity_bags),
      weight_kg: String(arrival.weight_kg),
      supplier_name: arrival.supplier_name || '',
      purchase_price: String(arrival.purchase_price),
      arrival_date: arrival.arrival_date,
      remarks: arrival.remarks || '',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        bean_type_id: formData.bean_type_id,
        quantity_bags: parseInt(formData.quantity_bags),
        weight_kg: parseFloat(formData.weight_kg),
        supplier_name: formData.supplier_name || undefined,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        arrival_date: formData.arrival_date,
        remarks: formData.remarks || undefined,
      })
      toast.success('Arrival recorded successfully')
      setIsModalOpen(false)
      resetForm()
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to record arrival'
          : 'Failed to record arrival'
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
          quantity_bags: parseInt(formData.quantity_bags),
          weight_kg: parseFloat(formData.weight_kg),
          supplier_name: formData.supplier_name || undefined,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          arrival_date: formData.arrival_date,
          remarks: formData.remarks || undefined,
        },
      })
      toast.success('Arrival updated successfully')
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
            Arrival Date *
          </label>
          <input
            type="date"
            value={formData.arrival_date}
            onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantity (Bags) *
          </label>
          <input
            type="number"
            value={formData.quantity_bags}
            onChange={(e) => setFormData({ ...formData, quantity_bags: e.target.value })}
            className="input-field"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weight (Viss) *
          </label>
          <input
            type="number"
            value={formData.weight_kg}
            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
            className="input-field"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Supplier Name
          </label>
          <input
            type="text"
            value={formData.supplier_name}
            onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Purchase Price
          </label>
          <input
            type="number"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            className="input-field"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Remarks
        </label>
        <textarea
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          className="input-field"
          rows={2}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Arrivals</h1>
          <p className="text-gray-500 dark:text-gray-400">Record incoming bean shipments</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-4 h-4" />
          Record Arrival
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
                  <th className="table-header">Bags</th>
                  <th className="table-header">Weight (Viss)</th>
                  <th className="table-header">Supplier</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Remarks</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {arrivals?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <FiTruck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      No arrivals recorded
                    </td>
                  </tr>
                ) : (
                  arrivals?.map((arrival) => (
                    <tr key={arrival.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell">{arrival.arrival_date}</td>
                      <td className="table-cell font-medium">{arrival.bean_type_name}</td>
                      <td className="table-cell">{arrival.quantity_bags}</td>
                      <td className="table-cell">{arrival.weight_kg.toFixed(2)}</td>
                      <td className="table-cell">{arrival.supplier_name || '-'}</td>
                      <td className="table-cell">{arrival.purchase_price.toFixed(2)}</td>
                      <td className="table-cell text-gray-500">{arrival.remarks || '-'}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(arrival)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(arrival.id)}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Arrival" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Record Arrival
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Arrival" maxWidth="lg">
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
