import { useState } from 'react'
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../hooks/useCustomers'
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
  FiPhone,
  FiMail,
  FiMapPin,
  FiDollarSign,
} from 'react-icons/fi'
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

const emptyForm = (): FormData => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

function formatCurrency(n: number): string {
  return n.toLocaleString()
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Customers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [formData, setFormData] = useState<FormData>(emptyForm())

  const { data: customers, isLoading } = useCustomers({
    search: search || undefined,
    active_only: !showInactive,
  })
  const { data: expandedCustomer } = useCustomer(expandedId ?? '')
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const resetForm = () => setFormData(emptyForm())

  // ── Create ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: CreateCustomerRequest = { name: formData.name }
      if (formData.phone) payload.phone = formData.phone
      if (formData.email) payload.email = formData.email
      if (formData.address) payload.address = formData.address
      if (formData.notes) payload.notes = formData.notes

      await createMutation.mutateAsync(payload)
      toast.success('Customer created')
      setIsCreateOpen(false)
      resetForm()
    } catch (error: unknown) {
      const msg =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to create'
          : 'Failed to create'
      toast.error(msg)
    }
  }

  // ── Edit ──

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      const payload: UpdateCustomerRequest = {}
      if (formData.name) payload.name = formData.name
      if (formData.phone !== undefined) payload.phone = formData.phone || undefined
      if (formData.email !== undefined) payload.email = formData.email || undefined
      if (formData.address !== undefined) payload.address = formData.address || undefined
      if (formData.notes !== undefined) payload.notes = formData.notes || undefined

      await updateMutation.mutateAsync({ id: editingId, data: payload })
      toast.success('Customer updated')
      setEditingId(null)
      resetForm()
    } catch (error: unknown) {
      const msg =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to update'
          : 'Failed to update'
      toast.error(msg)
    }
  }

  // ── Delete / Deactivate ──

  const handleDelete = async (customer: Customer) => {
    const hasSales = customer.sale_count > 0
    const message = hasSales
      ? `Customer "${customer.name}" has ${customer.sale_count} sale(s). Deleting will deactivate them instead. Continue?`
      : `Delete "${customer.name}"? This cannot be undone.`

    if (!confirm(message)) return

    try {
      const result = await deleteMutation.mutateAsync(customer.id)
      if (result.soft_delete) {
        toast.success(`Customer deactivated (has ${customer.sale_count} sale(s))`)
      } else {
        toast.success('Customer deleted')
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
          : 'Failed to delete'
      toast.error(msg)
    }
  }

  // ── Reactivate ──

  const handleReactivate = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_active: true } })
      toast.success('Customer reactivated')
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
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-field"
            required
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
        <div>
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

  // ── Expanded details (sale history) ──

  const saleHistorySection = expandedCustomer ? (
    <div className="text-sm space-y-2">
      {expandedCustomer.address && (
        <p>
          <FiMapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
          <span className="text-gray-500">Address:</span> {expandedCustomer.address}
        </p>
      )}
      {expandedCustomer.notes && (
        <p>
          <span className="text-gray-500">Notes:</span> {expandedCustomer.notes}
        </p>
      )}
      <div className="flex flex-wrap gap-4 mt-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          <FiDollarSign className="w-3 h-3" />
          Outstanding: {formatCurrency(expandedCustomer.outstanding_balance)}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          Total purchases: {formatCurrency(expandedCustomer.total_purchases)}
        </span>
      </div>

      <p className="font-medium text-gray-700 dark:text-gray-300 mt-3 mb-1">
        Recent Sales ({expandedCustomer.sale_count} total)
      </p>
      {expandedCustomer.recent_sales.length > 0 ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b dark:border-gray-700">
              <th className="text-left py-1 pr-2">Date</th>
              <th className="text-left px-2">Bean Type</th>
              <th className="text-right px-2">Bags</th>
              <th className="text-right px-2">Qty (Viss)</th>
              <th className="text-right pl-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expandedCustomer.recent_sales.map((s) => (
              <tr key={s.id} className="border-b dark:border-gray-700/50">
                <td className="py-1 pr-2">{s.sale_date}</td>
                <td className="px-2">{s.bean_type_name || '-'}</td>
                <td className="text-right px-2">{s.quantity_bags}</td>
                <td className="text-right px-2">{s.quantity.toFixed(2)}</td>
                <td className="text-right pl-2 font-medium">
                  {formatCurrency(s.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 italic">No sales yet</p>
      )}
    </div>
  ) : null

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage customer information and purchase history</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
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
        ) : !customers || customers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiUsers className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search ? 'No customers match your search' : 'No customers yet'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Email</th>
                    <th className="table-header text-center">Sales</th>
                    <th className="table-header text-right">Total Purchases</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {customers.map((customer) => (
                    <tbody key={customer.id} className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!customer.is_active ? 'opacity-60' : ''}`}>
                        <td className="table-cell font-medium">{customer.name}</td>
                        <td className="table-cell">{customer.phone || '-'}</td>
                        <td className="table-cell">{customer.email || '-'}</td>
                        <td className="table-cell text-center">{customer.sale_count}</td>
                        <td className="table-cell text-right font-medium">
                          {formatCurrency(customer.total_purchases)}
                        </td>
                        <td className="table-cell text-center">
                          {customer.is_active ? (
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
                            {!customer.is_active && (
                              <button
                                onClick={() => handleReactivate(customer.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600 hover:text-green-700"
                                title="Reactivate"
                              >
                                <FiRefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            {customer.is_active && (
                              <button
                                onClick={() => openEditModal(customer)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                                title="Edit"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(customer)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                              title={customer.sale_count > 0 ? 'Deactivate' : 'Delete'}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                              title={expandedId === customer.id ? 'Collapse' : 'Show sale history'}
                            >
                              {expandedId === customer.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === customer.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
                            {expandedId === customer.id ? saleHistorySection : null}
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
              {customers.map((customer) => (
                <div key={customer.id} className={`p-4 space-y-2 ${!customer.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{customer.name}</span>
                    {customer.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {customer.phone && (
                      <>
                        <span className="text-gray-500 flex items-center gap-1"><FiPhone className="w-3 h-3" /> Phone:</span>
                        <span className="text-gray-900 dark:text-gray-100">{customer.phone}</span>
                      </>
                    )}
                    {customer.email && (
                      <>
                        <span className="text-gray-500 flex items-center gap-1"><FiMail className="w-3 h-3" /> Email:</span>
                        <span className="text-gray-900 dark:text-gray-100">{customer.email}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Sales:</span> {customer.sale_count} |{' '}
                    <span className="text-gray-500">Total:</span> {formatCurrency(customer.total_purchases)}
                  </div>
                  {customer.outstanding_balance > 0 && (
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Outstanding: {formatCurrency(customer.outstanding_balance)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {!customer.is_active && (
                      <button
                        onClick={() => handleReactivate(customer.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg"
                      >
                        <FiRefreshCw className="w-3 h-3" /> Reactivate
                      </button>
                    )}
                    {customer.is_active && (
                      <button
                        onClick={() => openEditModal(customer)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg"
                      >
                        <FiEdit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(customer)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg"
                    >
                      <FiTrash2 className="w-3 h-3" /> {customer.sale_count > 0 ? 'Deactivate' : 'Delete'}
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {expandedId === customer.id ? <FiChevronUp /> : <FiChevronDown />}
                    {expandedId === customer.id ? 'Hide details' : `Show details (${customer.sale_count} sales)`}
                  </button>
                  {expandedId === customer.id && saleHistorySection}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="Add Customer" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Add Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => { setEditingId(null); resetForm() }} title="Edit Customer" maxWidth="lg">
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
