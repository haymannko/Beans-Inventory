import { useState } from 'react'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '../hooks/useSuppliers'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
} from 'react-icons/fi'
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FormData {
  company_name: string
  contact_person: string
  phone: string
  email: string
  address: string
  notes: string
}

const emptyForm = (): FormData => ({
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

// ─── Component ──────────────────────────────────────────────────────────────

export default function Suppliers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [formData, setFormData] = useState<FormData>(emptyForm())

  const { data: suppliers, isLoading } = useSuppliers({
    search: search || undefined,
    active_only: !showInactive,
  })
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  const resetForm = () => setFormData(emptyForm())

  // ── Create ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: CreateSupplierRequest = {
        company_name: formData.company_name,
      }
      if (formData.contact_person) payload.contact_person = formData.contact_person
      if (formData.phone) payload.phone = formData.phone
      if (formData.email) payload.email = formData.email
      if (formData.address) payload.address = formData.address
      if (formData.notes) payload.notes = formData.notes

      await createMutation.mutateAsync(payload)
      toast.success('Supplier created')
      setIsCreateOpen(false)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to create'
        : 'Failed to create'
      toast.error(msg)
    }
  }

  // ── Edit ──

  const openEditModal = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setFormData({
      company_name: supplier.company_name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      const payload: UpdateSupplierRequest = {}
      if (formData.company_name) payload.company_name = formData.company_name
      if (formData.contact_person !== undefined) payload.contact_person = formData.contact_person || undefined
      if (formData.phone !== undefined) payload.phone = formData.phone || undefined
      if (formData.email !== undefined) payload.email = formData.email || undefined
      if (formData.address !== undefined) payload.address = formData.address || undefined
      if (formData.notes !== undefined) payload.notes = formData.notes || undefined

      await updateMutation.mutateAsync({ id: editingId, data: payload })
      toast.success('Supplier updated')
      setEditingId(null)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to update'
        : 'Failed to update'
      toast.error(msg)
    }
  }

  // ── Delete ──

  const handleDelete = async (supplier: Supplier) => {
    const hasPos = supplier.purchase_order_count > 0
    const message = hasPos
      ? `Supplier "${supplier.company_name}" has ${supplier.purchase_order_count} purchase order(s). Deleting will deactivate it instead. Continue?`
      : `Delete "${supplier.company_name}"? This cannot be undone.`

    if (!confirm(message)) return

    try {
      const result = await deleteMutation.mutateAsync(supplier.id)
      if (result.soft_delete) {
        toast.success(`Supplier deactivated (has ${supplier.purchase_order_count} purchase order(s))`)
      } else {
        toast.success('Supplier deleted')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
        : 'Failed to delete'
      toast.error(msg)
    }
  }

  // ── Reactivate ──

  const handleReactivate = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_active: true } })
      toast.success('Supplier reactivated')
    } catch {
      toast.error('Failed to reactivate')
    }
  }

  // ── Form Fields ──

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company Name *
          </label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input-field"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="input-field"
            rows={2}
          />
        </div>
        <div className="md:col-span-2">
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
    </div>
  )

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage supplier information and purchase history</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, contact, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive
        </label>
      </div>

      {/* Data */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !suppliers || suppliers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiUsers className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search ? 'No suppliers match your search' : 'No suppliers yet'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Company</th>
                    <th className="table-header">Contact Person</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Email</th>
                    <th className="table-header text-center">POs</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {suppliers.map((supplier) => (
                    <tbody key={supplier.id} className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!supplier.is_active ? 'opacity-60' : ''}`}>
                        <td className="table-cell font-medium">{supplier.company_name}</td>
                        <td className="table-cell">{supplier.contact_person || '-'}</td>
                        <td className="table-cell">{supplier.phone || '-'}</td>
                        <td className="table-cell">{supplier.email || '-'}</td>
                        <td className="table-cell text-center">{supplier.purchase_order_count}</td>
                        <td className="table-cell text-center">
                          {supplier.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!supplier.is_active && (
                              <button
                                onClick={() => handleReactivate(supplier.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600 hover:text-green-700"
                                title="Reactivate"
                              >
                                <FiRefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            {supplier.is_active && (
                              <button
                                onClick={() => openEditModal(supplier)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                                title="Edit"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(supplier)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                              title={supplier.purchase_order_count > 0 ? 'Deactivate' : 'Delete'}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                              title={expandedId === supplier.id ? 'Collapse' : 'Show purchase history'}
                            >
                              {expandedId === supplier.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === supplier.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="text-sm space-y-2">
                              {supplier.address && (
                                <p><span className="text-gray-500">Address:</span> {supplier.address}</p>
                              )}
                              {supplier.notes && (
                                <p><span className="text-gray-500">Notes:</span> {supplier.notes}</p>
                              )}
                              <p className="font-medium text-gray-700 dark:text-gray-300 mt-3 mb-1">
                                Recent Purchase Orders ({supplier.purchase_order_count} total)
                              </p>
                              {supplier.recent_purchase_orders.length > 0 ? (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b dark:border-gray-700">
                                      <th className="text-left py-1 pr-2">PO #</th>
                                      <th className="text-left px-2">Status</th>
                                      <th className="text-right px-2">Items</th>
                                      <th className="text-right pl-2">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {supplier.recent_purchase_orders.map((po) => (
                                      <tr key={po.id} className="border-b dark:border-gray-700/50">
                                        <td className="py-1 pr-2 font-mono">{po.po_number}</td>
                                        <td className="px-2">{po.status}</td>
                                        <td className="text-right px-2">{po.item_count}</td>
                                        <td className="text-right pl-2 font-medium">{po.total_amount.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-gray-400 italic">No purchase orders yet</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className={`p-4 space-y-2 ${!supplier.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{supplier.company_name}</span>
                    {supplier.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        Inactive
                      </span>
                    )}
                  </div>
                  {supplier.contact_person && (
                    <div className="text-sm"><span className="text-gray-500">Contact:</span> {supplier.contact_person}</div>
                  )}
                  {supplier.phone && (
                    <div className="text-sm"><span className="text-gray-500">Phone:</span> {supplier.phone}</div>
                  )}
                  {supplier.email && (
                    <div className="text-sm"><span className="text-gray-500">Email:</span> {supplier.email}</div>
                  )}
                  <div className="text-sm"><span className="text-gray-500">POs:</span> {supplier.purchase_order_count}</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {!supplier.is_active && (
                      <button
                        onClick={() => handleReactivate(supplier.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg"
                      >
                        <FiRefreshCw className="w-3 h-3" /> Reactivate
                      </button>
                    )}
                    {supplier.is_active && (
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg"
                      >
                        <FiEdit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg"
                    >
                      <FiTrash2 className="w-3 h-3" /> {supplier.purchase_order_count > 0 ? 'Deactivate' : 'Delete'}
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {expandedId === supplier.id ? <FiChevronUp /> : <FiChevronDown />}
                    {expandedId === supplier.id ? 'Hide details' : `Show details (${supplier.purchase_order_count} POs)`}
                  </button>
                  {expandedId === supplier.id && (
                    <div className="pt-1 space-y-1 text-xs">
                      {supplier.address && <p className="text-gray-500">Address: {supplier.address}</p>}
                      {supplier.notes && <p className="text-gray-500">Notes: {supplier.notes}</p>}
                      {supplier.recent_purchase_orders.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Recent POs:</p>
                          {supplier.recent_purchase_orders.map((po) => (
                            <div key={po.id} className="flex justify-between py-1 px-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                              <span className="font-mono">{po.po_number}</span>
                              <span>{po.item_count} items | {po.total_amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="Add Supplier" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Add Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => { setEditingId(null); resetForm() }} title="Edit Supplier" maxWidth="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setEditingId(null); resetForm() }} className="btn-secondary w-full sm:w-auto">
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
