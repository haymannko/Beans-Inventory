import { useState } from 'react'
import { useWeightMasterList, useCreateWeightMaster, useUpdateWeightMaster, useDeleteWeightMaster } from '../hooks/useWeightMaster'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'

export default function WeightMaster() {
  const [search, setSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [beanName, setBeanName] = useState('')
  const [weight, setWeight] = useState('')

  const { data: weightList, isLoading, error } = useWeightMasterList(search)
  const createMutation = useCreateWeightMaster()
  const updateMutation = useUpdateWeightMaster()
  const deleteMutation = useDeleteWeightMaster()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightNum = parseFloat(weight)
    if (!beanName.trim()) { toast.error('Please enter bean name'); return }
    if (isNaN(weightNum) || weightNum <= 0) { toast.error('Please enter valid weight'); return }
    try {
      await createMutation.mutateAsync({ bean_name: beanName.trim(), weight: weightNum })
      toast.success('Created successfully')
      setIsCreateModalOpen(false); setBeanName(''); setWeight('')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed' : 'Failed'
      toast.error(msg)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    const weightNum = parseFloat(weight)
    if (!beanName.trim()) { toast.error('Please enter bean name'); return }
    if (isNaN(weightNum) || weightNum <= 0) { toast.error('Please enter valid weight'); return }
    try {
      await updateMutation.mutateAsync({ id: editingId, data: { bean_name: beanName.trim(), weight: weightNum } })
      toast.success('Updated successfully')
      setEditingId(null); setBeanName(''); setWeight('')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed' : 'Failed'
      toast.error(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Deleted successfully')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed' : 'Failed'
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">အသားအလေးချိန်စာရင်း</h1>
          <p className="text-gray-500 dark:text-gray-400">Weight Master</p>
        </div>
        <button onClick={() => { setBeanName(''); setWeight(''); setIsCreateModalOpen(true) }} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" /> Add Weight
        </button>
      </div>

      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bean name..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-red-500">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1">
              {(() => {
                const axiosError = error as { response?: { data?: { detail?: string | { message?: string } } } }
                const detail = axiosError?.response?.data?.detail
                if (typeof detail === 'object' && detail?.message) return detail.message
                if (typeof detail === 'string') return detail
                return 'Failed to load weight master data. Please try again.'
              })()}
            </p>
          </div>
        ) : weightList?.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No records found</div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">ကုန်အမျိုးအမည်</th>
                    <th className="table-header">အသားအလေးချိန်</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {weightList?.map((wm) => (
                    <tr key={wm.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell font-medium">{wm.bean_name}</td>
                      <td className="table-cell">{wm.weight}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingId(wm.id); setBeanName(wm.bean_name); setWeight(String(wm.weight)) }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(wm.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"><FiTrash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {weightList?.map((wm) => (
                <div key={wm.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{wm.bean_name}</span>
                    <span className="text-sm text-primary-600 font-medium">{wm.weight}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setEditingId(wm.id); setBeanName(wm.bean_name); setWeight(String(wm.weight)) }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"><FiEdit2 className="w-4 h-4" /> Edit</button>
                    <button onClick={() => handleDelete(wm.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600"><FiTrash2 className="w-4 h-4" /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Weight">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ကုန်အမျိုးအမည် *</label>
            <input type="text" value={beanName} onChange={(e) => setBeanName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">အသားအလေးချိန် *</label>
            <input type="number" step="0.01" min="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="input-field" placeholder="e.g. 56.25" required />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Create</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Weight">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ကုန်အမျိုးအမည် *</label>
            <input type="text" value={beanName} onChange={(e) => setBeanName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">အသားအလေးချိန် *</label>
            <input type="number" step="0.01" min="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="input-field" required />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setEditingId(null)} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Update</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
