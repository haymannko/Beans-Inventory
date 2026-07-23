import { useState } from 'react'
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  useReceivePurchaseOrder,
} from '../hooks/usePurchaseOrders'
import { useBeanTypes } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiShoppingCart,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiSend,
  FiXCircle,
  FiPackage,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  CreatePurchaseOrderItemRequest,
} from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-700' },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ordered: { label: 'Ordered', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  received: { label: 'Received', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
}

interface ItemFormEntry {
  bean_type_id: string
  quantity_bags: string
  unit_price: string
  notes: string
}

const emptyItem = (): ItemFormEntry => ({
  bean_type_id: '',
  quantity_bags: '',
  unit_price: '',
  notes: '',
})

// ─── Component ──────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [receivePoId, setReceivePoId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [formData, setFormData] = useState({
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
  })
  const [items, setItems] = useState<ItemFormEntry[]>([emptyItem()])

  const [receiveItems, setReceiveItems] = useState<Record<string, string>>({})

  const { data: purchaseOrders, isLoading } = usePurchaseOrders({
    search: search || undefined,
    status: statusFilter || undefined,
  })
  const { data: beanTypes } = useBeanTypes()
  const createMutation = useCreatePurchaseOrder()
  const updateMutation = useUpdatePurchaseOrder()
  const deleteMutation = useDeletePurchaseOrder()
  const statusMutation = useUpdatePurchaseOrderStatus()
  const receiveMutation = useReceivePurchaseOrder()

  const resetForm = () => {
    setFormData({
      supplier_name: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
    })
    setItems([emptyItem()])
  }

  // ── Create ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const validItems: CreatePurchaseOrderItemRequest[] = items
        .filter((i) => i.bean_type_id && i.quantity_bags)
        .map((i) => ({
          bean_type_id: i.bean_type_id,
          quantity_bags: parseInt(i.quantity_bags),
          unit_price: parseFloat(i.unit_price) || 0,
          notes: i.notes || undefined,
        }))

      if (validItems.length === 0) {
        toast.error('Add at least one item')
        return
      }

      await createMutation.mutateAsync({
        supplier_name: formData.supplier_name,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        notes: formData.notes || undefined,
        items: validItems,
      })
      toast.success('Purchase order created')
      setIsCreateOpen(false)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  // ── Edit ──

  const openEditModal = (po: PurchaseOrder) => {
    setEditingId(po.id)
    setFormData({
      supplier_name: po.supplier_name,
      order_date: po.order_date,
      expected_delivery_date: po.expected_delivery_date || '',
      notes: po.notes || '',
    })
    setItems(
      po.items.map((i) => ({
        bean_type_id: i.bean_type_id,
        quantity_bags: String(i.quantity_bags),
        unit_price: String(i.unit_price),
        notes: i.notes || '',
      }))
    )
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      const validItems = items
        .filter((i) => i.bean_type_id && i.quantity_bags)
        .map((i) => ({
          bean_type_id: i.bean_type_id,
          quantity_bags: parseInt(i.quantity_bags),
          unit_price: parseFloat(i.unit_price) || 0,
          notes: i.notes || undefined,
        }))

      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          supplier_name: formData.supplier_name,
          order_date: formData.order_date,
          expected_delivery_date: formData.expected_delivery_date || undefined,
          notes: formData.notes || undefined,
          items: validItems,
        },
      })
      toast.success('Purchase order updated')
      setEditingId(null)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  // ── Delete ──

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase order? This cannot be undone.')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Purchase order deleted')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  // ── Status Transition ──

  const handleStatusChange = async (id: string, status: PurchaseOrderStatus) => {
    try {
      await statusMutation.mutateAsync({ id, data: { status } })
      toast.success(`Status changed to ${status}`)
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  // ── Receive ──

  const openReceiveModal = (po: PurchaseOrder) => {
    setReceivePoId(po.id)
    const initial: Record<string, string> = {}
    po.items.forEach((item) => {
      const remaining = item.quantity_bags - item.received_quantity_bags
      initial[item.id] = String(remaining)
    })
    setReceiveItems(initial)
  }

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receivePoId) return
    try {
      const itemsData = Object.entries(receiveItems)
        .filter(([_, qty]) => parseInt(qty) > 0)
        .map(([item_id, received_quantity_bags]) => ({
          item_id,
          received_quantity_bags: parseInt(received_quantity_bags),
        }))

      if (itemsData.length === 0) {
        toast.error('Enter at least one item quantity')
        return
      }

      await receiveMutation.mutateAsync({ id: receivePoId, data: { items: itemsData } })
      toast.success('Items received successfully')
      setReceivePoId(null)
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  // ── Status Action Buttons ──

  const StatusActions = ({ po }: { po: PurchaseOrder }) => {
    const actions: { label: string; status: PurchaseOrderStatus; icon: React.ReactNode; color: string }[] = []

    if (po.status === 'draft') {
      actions.push({ label: 'Approve', status: 'approved', icon: <FiCheck className="w-4 h-4" />, color: 'bg-blue-600 hover:bg-blue-700' })
      actions.push({ label: 'Cancel', status: 'cancelled', icon: <FiXCircle className="w-4 h-4" />, color: 'bg-red-600 hover:bg-red-700' })
    } else if (po.status === 'approved') {
      actions.push({ label: 'Mark Ordered', status: 'ordered', icon: <FiSend className="w-4 h-4" />, color: 'bg-yellow-600 hover:bg-yellow-700' })
      actions.push({ label: 'Cancel', status: 'cancelled', icon: <FiXCircle className="w-4 h-4" />, color: 'bg-red-600 hover:bg-red-700' })
    } else if (po.status === 'ordered') {
      actions.push({ label: 'Mark Received', status: 'received', icon: <FiPackage className="w-4 h-4" />, color: 'bg-green-600 hover:bg-green-700' })
      actions.push({ label: 'Cancel', status: 'cancelled', icon: <FiXCircle className="w-4 h-4" />, color: 'bg-red-600 hover:bg-red-700' })
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => handleStatusChange(po.id, action.status)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${action.color}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  // ── Form Fields (shared between Create and Edit) ──

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Supplier Name *
          </label>
          <input
            type="text"
            value={formData.supplier_name}
            onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Order Date *
          </label>
          <input
            type="date"
            value={formData.order_date}
            onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expected Delivery
          </label>
          <input
            type="date"
            value={formData.expected_delivery_date}
            onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input-field"
          rows={2}
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items *</label>
          <button
            type="button"
            onClick={() => setItems([...items, emptyItem()])}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <select
                value={item.bean_type_id}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[idx] = { ...newItems[idx], bean_type_id: e.target.value }
                  setItems(newItems)
                }}
                className="input-field text-sm flex-1"
                required
              >
                <option value="">Select bean type</option>
                {beanTypes?.map((bt) => (
                  <option key={bt.id} value={bt.id}>{bt.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Bags"
                value={item.quantity_bags}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[idx] = { ...newItems[idx], quantity_bags: e.target.value }
                  setItems(newItems)
                }}
                className="input-field text-sm w-full sm:w-24"
                min="1"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Unit Price"
                value={item.unit_price}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[idx] = { ...newItems[idx], unit_price: e.target.value }
                  setItems(newItems)
                }}
                className="input-field text-sm w-full sm:w-32"
                min="0"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:text-red-700 p-2 shrink-0"
                >
                  <FiXCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage supplier purchase orders and receiving</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          New Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search PO number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-44"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Data */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !purchaseOrders || purchaseOrders.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search || statusFilter ? 'No purchase orders match your filters' : 'No purchase orders yet'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">PO #</th>
                    <th className="table-header">Supplier</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Order Date</th>
                    <th className="table-header">Items</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {purchaseOrders.map((po) => (
                    <tbody key={po.id} className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="table-cell font-mono font-medium">{po.po_number}</td>
                        <td className="table-cell">{po.supplier_name}</td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[po.status].bg} ${STATUS_CONFIG[po.status].color}`}>
                            {STATUS_CONFIG[po.status].label}
                          </span>
                        </td>
                        <td className="table-cell">{po.order_date}</td>
                        <td className="table-cell">{po.items.length}</td>
                        <td className="table-cell font-medium">
                          {po.items.reduce((sum, i) => sum + i.total_price, 0).toLocaleString()}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            {po.status === 'ordered' && (
                              <button
                                onClick={() => openReceiveModal(po)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600 hover:text-green-700"
                                title="Receive items"
                              >
                                <FiPackage className="w-4 h-4" />
                              </button>
                            )}
                            {(po.status === 'draft' || po.status === 'approved') && (
                              <button
                                onClick={() => openEditModal(po)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                                title="Edit"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            )}
                            {po.status === 'draft' && (
                              <button
                                onClick={() => handleDelete(po.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                                title="Delete"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedId(expandedId === po.id ? null : po.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                              title={expandedId === po.id ? 'Collapse' : 'Expand'}
                            >
                              {expandedId === po.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === po.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
                            {/* Items table */}
                            <div className="text-sm space-y-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                <StatusActions po={po} />
                              </div>
                              {po.notes && (
                                <p className="text-gray-500 italic">Notes: {po.notes}</p>
                              )}
                              {po.expected_delivery_date && (
                                <p className="text-gray-500">Expected: {po.expected_delivery_date}</p>
                              )}
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 border-b dark:border-gray-700">
                                    <th className="text-left py-1 pr-2">Bean Type</th>
                                    <th className="text-right px-2">Bags</th>
                                    <th className="text-right px-2">Unit Price</th>
                                    <th className="text-right px-2">Total</th>
                                    <th className="text-right pl-2">Received</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {po.items.map((item) => (
                                    <tr key={item.id} className="border-b dark:border-gray-700/50">
                                      <td className="py-1 pr-2">{item.bean_type_name || item.bean_type_id}</td>
                                      <td className="text-right px-2">{item.quantity_bags}</td>
                                      <td className="text-right px-2">{item.unit_price.toLocaleString()}</td>
                                      <td className="text-right px-2 font-medium">{(item.quantity_bags * item.unit_price).toLocaleString()}</td>
                                      <td className="text-right pl-2">
                                        {item.received_quantity_bags}/{item.quantity_bags}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
              {purchaseOrders.map((po) => (
                <div key={po.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{po.po_number}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[po.status].bg} ${STATUS_CONFIG[po.status].color}`}>
                      {STATUS_CONFIG[po.status].label}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Supplier: </span>
                    <span className="text-gray-900 dark:text-gray-100">{po.supplier_name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Date: </span>
                    <span className="text-gray-900 dark:text-gray-100">{po.order_date}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Items: </span>
                    <span className="text-gray-900 dark:text-gray-100">{po.items.length}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Total: </span>
                    <span className="font-medium">{po.items.reduce((sum, i) => sum + i.total_price, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <StatusActions po={po} />
                    {po.status === 'ordered' && (
                      <button
                        onClick={() => openReceiveModal(po)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg"
                      >
                        <FiPackage className="w-3 h-3" /> Receive
                      </button>
                    )}
                    {(po.status === 'draft' || po.status === 'approved') && (
                      <button
                        onClick={() => openEditModal(po)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg"
                      >
                        <FiEdit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                    {po.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(po.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg"
                      >
                        <FiTrash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                  {/* Expandable items */}
                  <button
                    onClick={() => setExpandedId(expandedId === po.id ? null : po.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {expandedId === po.id ? <FiChevronUp /> : <FiChevronDown />}
                    {expandedId === po.id ? 'Hide items' : 'Show items'}
                  </button>
                  {expandedId === po.id && (
                    <div className="pt-1 space-y-1 text-xs">
                      {po.items.map((item) => (
                        <div key={item.id} className="flex justify-between py-1 px-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <span>{item.bean_type_name || item.bean_type_id}</span>
                          <span className="font-medium">{item.quantity_bags} bags × {item.unit_price.toLocaleString()} = {(item.quantity_bags * item.unit_price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="New Purchase Order" maxWidth="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Create Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => { setEditingId(null); resetForm() }} title="Edit Purchase Order" maxWidth="xl">
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

      {/* Receive Modal */}
      <Modal isOpen={!!receivePoId} onClose={() => setReceivePoId(null)} title="Receive Items" maxWidth="lg">
        <form onSubmit={handleReceive} className="space-y-4">
          {receivePoId && (
            <div className="space-y-3">
              {purchaseOrders
                ?.find((po) => po.id === receivePoId)
                ?.items.map((item) => {
                  const remaining = item.quantity_bags - item.received_quantity_bags
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.bean_type_name || item.bean_type_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Ordered: {item.quantity_bags} | Received: {item.received_quantity_bags} | Remaining: {remaining}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500">Receive:</label>
                        <input
                          type="number"
                          value={receiveItems[item.id] || ''}
                          onChange={(e) => setReceiveItems({ ...receiveItems, [item.id]: e.target.value })}
                          className="input-field w-24 text-sm"
                          min="1"
                          max={remaining}
                          required
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setReceivePoId(null)} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Receive Items
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
