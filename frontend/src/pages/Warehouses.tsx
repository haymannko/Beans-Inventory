import { useState } from 'react'
import {
  useWarehouses,
  useWarehouseInventory,
  useWarehouseTransfers,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
} from '../hooks/useWarehouses'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import {
  FiPlus, FiHome, FiEdit2, FiTrash2, FiSearch,
  FiChevronDown, FiChevronUp, FiRefreshCw, FiMapPin, FiPhone,
} from 'react-icons/fi'
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '../types'

interface FormData {
  name: string
  location: string
  contact_person: string
  phone: string
  notes: string
}

const emptyForm = (): FormData => ({
  name: '', location: '', contact_person: '', phone: '', notes: '',
})

export default function Warehouses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm())

  const { data: warehouses, isLoading } = useWarehouses({
    search: search || undefined,
    active_only: !showInactive,
  })
  const { data: inventory } = useWarehouseInventory(expandedId ?? '')
  const { data: transfers } = useWarehouseTransfers(expandedId ?? '')
  const createMutation = useCreateWarehouse()
  const updateMutation = useUpdateWarehouse()
  const deleteMutation = useDeleteWarehouse()

  const resetForm = () => setFormData(emptyForm())

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const p: CreateWarehouseRequest = { name: formData.name }
      if (formData.location) p.location = formData.location
      if (formData.contact_person) p.contact_person = formData.contact_person
      if (formData.phone) p.phone = formData.phone
      if (formData.notes) p.notes = formData.notes
      await createMutation.mutateAsync(p)
      toast.success('Warehouse created')
      setIsCreateOpen(false)
      resetForm()
    } catch (e: unknown) {
      const m = e instanceof Error && 'response' in e
        ? (e as any).response?.data?.detail || 'Failed' : 'Failed'
      toast.error(m)
    }
  }

  const openEdit = (w: Warehouse) => {
    setEditingId(w.id)
    setFormData({
      name: w.name, location: w.location || '',
      contact_person: w.contact_person || '', phone: w.phone || '', notes: w.notes || '',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      const p: UpdateWarehouseRequest = {}
      if (formData.name) p.name = formData.name
      if (formData.location !== undefined) p.location = formData.location || undefined
      if (formData.contact_person !== undefined) p.contact_person = formData.contact_person || undefined
      if (formData.phone !== undefined) p.phone = formData.phone || undefined
      if (formData.notes !== undefined) p.notes = formData.notes || undefined
      await updateMutation.mutateAsync({ id: editingId, data: p })
      toast.success('Warehouse updated')
      setEditingId(null)
      resetForm()
    } catch (e: unknown) {
      const m = e instanceof Error && 'response' in e
        ? (e as any).response?.data?.detail || 'Failed' : 'Failed'
      toast.error(m)
    }
  }

  const handleDelete = async (w: Warehouse) => {
    const has = w.storage_count > 0
    if (!confirm(has
      ? `Warehouse "${w.name}" has ${w.storage_count} storage record(s). Deleting will deactivate it instead. Continue?`
      : `Delete "${w.name}"? This cannot be undone.`)) return
    try {
      const r = await deleteMutation.mutateAsync(w.id)
      toast.success(r.soft_delete ? 'Warehouse deactivated' : 'Warehouse deleted')
    } catch (e: unknown) {
      toast.error(e instanceof Error && 'response' in e
        ? (e as any).response?.data?.detail || 'Failed' : 'Failed')
    }
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
          <input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
          <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={2} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouses</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage warehouses and inventory per location</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" /> Add Warehouse
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, location, contact..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
          Show inactive
        </label>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : !warehouses || warehouses.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiHome className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search ? 'No warehouses match your search' : 'No warehouses yet'}
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Contact</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header text-center">Total Bags</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {warehouses.map((w) => (
                    <tbody key={w.id} className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!w.is_active ? 'opacity-60' : ''}`}>
                        <td className="table-cell font-medium">{w.name}</td>
                        <td className="table-cell">{w.location || '-'}</td>
                        <td className="table-cell">{w.contact_person || '-'}</td>
                        <td className="table-cell">{w.phone || '-'}</td>
                        <td className="table-cell text-center font-medium">{w.total_bags}</td>
                        <td className="table-cell text-center">
                          {w.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Active</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Inactive</span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!w.is_active && (
                              <button onClick={() => updateMutation.mutateAsync({ id: w.id, data: { is_active: true } }).then(() => toast.success('Reactivated')).catch(() => toast.error('Failed'))}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600" title="Reactivate"><FiRefreshCw className="w-4 h-4" /></button>
                            )}
                            {w.is_active && (
                              <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => handleDelete(w)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                              title={w.storage_count > 0 ? 'Deactivate' : 'Delete'}><FiTrash2 className="w-4 h-4" /></button>
                            <button onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                              {expandedId === w.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === w.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="text-sm space-y-3">
                              {w.notes && <p><span className="text-gray-500">Notes:</span> {w.notes}</p>}
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Inventory by Bean Type</p>
                                {inventory && inventory.length > 0 ? (
                                  <table className="w-full text-xs">
                                    <thead><tr className="text-gray-500 border-b dark:border-gray-700">
                                      <th className="text-left py-1 pr-2">Bean Type</th>
                                      <th className="text-right px-2">Bags</th>
                                      <th className="text-right pl-2">Weight (Viss)</th>
                                    </tr></thead>
                                    <tbody>{inventory.map((i) => (
                                      <tr key={i.bean_type_id} className="border-b dark:border-gray-700/50">
                                        <td className="py-1 pr-2">{i.bean_type_name}</td>
                                        <td className="text-right px-2">{i.quantity_bags}</td>
                                        <td className="text-right pl-2">{i.quantity.toFixed(2)}</td>
                                      </tr>
                                    ))}</tbody>
                                  </table>
                                ) : <p className="text-gray-400 italic">No inventory</p>}
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Transfers</p>
                                {transfers && transfers.length > 0 ? (
                                  <table className="w-full text-xs">
                                    <thead><tr className="text-gray-500 border-b dark:border-gray-700">
                                      <th className="text-left py-1 pr-2">Date</th>
                                      <th className="text-left px-2">Direction</th>
                                      <th className="text-left px-2">Bean</th>
                                      <th className="text-right pl-2">Bags</th>
                                    </tr></thead>
                                    <tbody>{transfers.slice(0, 5).map((t) => (
                                      <tr key={t.id} className="border-b dark:border-gray-700/50">
                                        <td className="py-1 pr-2">{t.transfer_date}</td>
                                        <td className="px-2">{t.from_warehouse_name} → {t.to_warehouse_name}</td>
                                        <td className="px-2">{t.bean_type_name || '-'}</td>
                                        <td className="text-right pl-2">{t.quantity_bags}</td>
                                      </tr>
                                    ))}</tbody>
                                  </table>
                                ) : <p className="text-gray-400 italic">No transfers</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {warehouses.map((w) => (
                <div key={w.id} className={`p-4 space-y-2 ${!w.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{w.name}</span>
                    {w.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Inactive</span>
                    )}
                  </div>
                  {w.location && <div className="text-sm flex items-center gap-1"><FiMapPin className="w-3 h-3 text-gray-400" /> {w.location}</div>}
                  {w.contact_person && <div className="text-sm flex items-center gap-1"><FiPhone className="w-3 h-3 text-gray-400" /> {w.contact_person}</div>}
                  <div className="text-sm"><span className="text-gray-500">Bags:</span> {w.total_bags}</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {!w.is_active && (
                      <button onClick={() => updateMutation.mutateAsync({ id: w.id, data: { is_active: true } }).then(() => toast.success('Reactivated'))}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 rounded-lg"><FiRefreshCw className="w-3 h-3" /> Reactivate</button>
                    )}
                    {w.is_active && (
                      <button onClick={() => openEdit(w)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><FiEdit2 className="w-3 h-3" /> Edit</button>
                    )}
                    <button onClick={() => handleDelete(w)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <FiTrash2 className="w-3 h-3" /> {w.storage_count > 0 ? 'Deactivate' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="Add Warehouse" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Add Warehouse</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingId} onClose={() => { setEditingId(null); resetForm() }} title="Edit Warehouse" maxWidth="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setEditingId(null); resetForm() }} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Update</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
