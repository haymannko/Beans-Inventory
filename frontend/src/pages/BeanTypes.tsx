import { useState } from 'react'
import { useBeanTypes, useCreateBeanType, useUpdateBeanType, useDeleteBeanType } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'

export default function BeanTypes() {
  const [search, setSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data: beanTypes, isLoading } = useBeanTypes(search)
  const createMutation = useCreateBeanType()
  const updateMutation = useUpdateBeanType()
  const deleteMutation = useDeleteBeanType()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({ name, description: description || undefined })
      toast.success('Bean type created successfully')
      setIsCreateModalOpen(false)
      setName('')
      setDescription('')
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
        data: { name, description: description || undefined },
      })
      toast.success('Bean type updated successfully')
      setEditingId(null)
      setName('')
      setDescription('')
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to update'
          : 'Failed to update'
      toast.error(message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bean type?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Bean type deleted successfully')
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
          : 'Failed to delete'
      toast.error(message)
    }
  }

  const openEditModal = (id: string, currentName: string, currentDescription: string | null) => {
    setEditingId(id)
    setName(currentName)
    setDescription(currentDescription || '')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bean Types</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your bean type catalog</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-4 h-4" />
          Add Bean Type
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bean types..."
            className="input-field pl-10"
          />
        </div>
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
                  <th className="table-header">Name</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Created</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {beanTypes?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No bean types found
                    </td>
                  </tr>
                ) : (
                  beanTypes?.map((bt) => (
                    <tr key={bt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell font-medium">{bt.name}</td>
                      <td className="table-cell text-gray-500">{bt.description || '-'}</td>
                      <td className="table-cell text-gray-500">
                        {new Date(bt.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(bt.id, bt.name, bt.description)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bt.id)}
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
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Bean Type">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Bean Type">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
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
