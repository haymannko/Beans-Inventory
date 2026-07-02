import { useState } from 'react'
import { useStorages, useCreateStorage, useUpdateStorage, useDeleteStorage } from '../hooks/useStorages'
import { useBeanTypes } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiArchive, FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Storage } from '../types'

export default function Storages() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    bean_type_id: '',
    quantity_bags: '',
    quantity: '',
    warehouse_name: '',
    storage_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { data: storages, isLoading } = useStorages()
  const { data: beanTypes } = useBeanTypes()
  const createMutation = useCreateStorage()
  const updateMutation = useUpdateStorage()
  const deleteMutation = useDeleteStorage()

  const resetForm = () => {
    setFormData({
      bean_type_id: '',
      quantity_bags: '',
      quantity: '',
      warehouse_name: '',
      storage_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this storage record?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Storage record deleted successfully')
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
          : 'Failed to delete'
      toast.error(message)
    }
  }

  const openEditModal = (storage: Storage) => {
    setEditingId(storage.id)
    setFormData({
      bean_type_id: storage.bean_type_id,
      quantity_bags: String(storage.quantity_bags),
      quantity: String(storage.quantity),
      warehouse_name: storage.warehouse_name || '',
      storage_date: storage.storage_date,
      notes: storage.notes || '',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        bean_type_id: formData.bean_type_id,
        quantity_bags: parseInt(formData.quantity_bags) || 0,
        quantity: parseFloat(formData.quantity),
        warehouse_name: formData.warehouse_name || undefined,
        storage_date: formData.storage_date,
        notes: formData.notes || undefined,
      })
      toast.success('Storage record created successfully')
      setIsModalOpen(false)
      resetForm()
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to create'
          : 'Failed to create'
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
          quantity_bags: parseInt(formData.quantity_bags) || 0,
          quantity: parseFloat(formData.quantity),
          warehouse_name: formData.warehouse_name || undefined,
          storage_date: formData.storage_date,
          notes: formData.notes || undefined,
        },
      })
      toast.success('Storage record updated successfully')
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
            Bags
          </label>
          <input
            type="number"
            value={formData.quantity_bags}
            onChange={(e) => setFormData({ ...formData, quantity_bags: e.target.value })}
            className="input-field"
            min="0"
          />
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
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Storage Date *
          </label>
          <input
            type="date"
            value={formData.storage_date}
            onChange={(e) => setFormData({ ...formData, storage_date: e.target.value })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Warehouse Name
          </label>
          <input
            type="text"
            value={formData.warehouse_name}
            onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input-field"
          rows={2}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Storage</h1>
          <p className="text-gray-500 dark:text-gray-400">Track warehouse storage</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          Add Storage Record
        </button>
      </div>

      {/* Data */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : storages?.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiArchive className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No storage records
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
                    <th className="table-header">Bags</th>
                    <th className="table-header">Weight (Viss)</th>
                    <th className="table-header">Warehouse</th>
                    <th className="table-header">Notes</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {storages?.map((storage) => (
                    <tr key={storage.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell">{storage.storage_date}</td>
                      <td className="table-cell font-medium">{storage.bean_type_name}</td>
                      <td className="table-cell">{storage.quantity_bags}</td>
                      <td className="table-cell">{storage.quantity.toFixed(2)}</td>
                      <td className="table-cell">{storage.warehouse_name || '-'}</td>
                      <td className="table-cell text-gray-500">{storage.notes || '-'}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(storage)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(storage.id)}
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
              {storages?.map((storage) => (
                <div key={storage.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{storage.bean_type_name}</span>
                    <span className="text-xs text-gray-500">{storage.storage_date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-gray-500">Bags:</span>
                    <span className="text-gray-900 dark:text-gray-100">{storage.quantity_bags}</span>
                    <span className="text-gray-500">Weight:</span>
                    <span className="text-gray-900 dark:text-gray-100">{storage.quantity.toFixed(2)} Viss</span>
                    {storage.warehouse_name && (
                      <>
                        <span className="text-gray-500">Warehouse:</span>
                        <span className="text-gray-900 dark:text-gray-100">{storage.warehouse_name}</span>
                      </>
                    )}
                  </div>
                  {storage.notes && (
                    <p className="text-xs text-gray-500">{storage.notes}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openEditModal(storage)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FiEdit2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(storage.id)}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Storage Record" maxWidth="lg">
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
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Storage Record" maxWidth="lg">
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
