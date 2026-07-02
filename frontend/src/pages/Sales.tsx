import { useState } from 'react'
import { useSales, useCreateSale, useUpdateSale, useDeleteSale } from '../hooks/useSales'
import { useBeanTypes } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiDollarSign, FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { Sale } from '../types'

export default function Sales() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    bean_type_id: '',
    quantity_bags: '',
    quantity: '',
    customer_name: '',
    sale_price: '',
    invoice_no: '',
    sale_date: new Date().toISOString().split('T')[0],
    remarks: '',
  })

  const { data: sales, isLoading } = useSales()
  const { data: beanTypes } = useBeanTypes()
  const createMutation = useCreateSale()
  const updateMutation = useUpdateSale()
  const deleteMutation = useDeleteSale()

  const resetForm = () => {
    setFormData({
      bean_type_id: '',
      quantity_bags: '',
      quantity: '',
      customer_name: '',
      sale_price: '',
      invoice_no: '',
      sale_date: new Date().toISOString().split('T')[0],
      remarks: '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sale record?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Sale deleted successfully')
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
          : 'Failed to delete'
      toast.error(message)
    }
  }

  const openEditModal = (sale: Sale) => {
    setEditingId(sale.id)
    setFormData({
      bean_type_id: sale.bean_type_id,
      quantity_bags: String(sale.quantity_bags),
      quantity: String(sale.quantity),
      customer_name: sale.customer_name || '',
      sale_price: String(sale.sale_price),
      invoice_no: sale.invoice_no || '',
      sale_date: sale.sale_date,
      remarks: sale.remarks || '',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        bean_type_id: formData.bean_type_id,
        quantity_bags: parseInt(formData.quantity_bags) || 0,
        quantity: parseFloat(formData.quantity),
        customer_name: formData.customer_name || undefined,
        sale_price: parseFloat(formData.sale_price) || 0,
        invoice_no: formData.invoice_no || undefined,
        sale_date: formData.sale_date,
        remarks: formData.remarks || undefined,
      })
      toast.success('Sale recorded successfully')
      setIsModalOpen(false)
      resetForm()
    } catch (error: unknown) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to record sale'
          : 'Failed to record sale'
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
          customer_name: formData.customer_name || undefined,
          sale_price: parseFloat(formData.sale_price) || 0,
          invoice_no: formData.invoice_no || undefined,
          sale_date: formData.sale_date,
          remarks: formData.remarks || undefined,
        },
      })
      toast.success('Sale updated successfully')
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
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sale Date *
          </label>
          <input
            type="date"
            value={formData.sale_date}
            onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sale Price
          </label>
          <input
            type="number"
            value={formData.sale_price}
            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
            className="input-field"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Invoice Number
          </label>
          <input
            type="text"
            value={formData.invoice_no}
            onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
            className="input-field"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-500 dark:text-gray-400">Record bean sales</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          Record Sale
        </button>
      </div>

      {/* Data */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : sales?.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiDollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No sales recorded
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
                    <th className="table-header">Customer</th>
                    <th className="table-header">Price</th>
                    <th className="table-header">Invoice</th>
                    <th className="table-header">Remarks</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sales?.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell">{sale.sale_date}</td>
                      <td className="table-cell font-medium">{sale.bean_type_name}</td>
                      <td className="table-cell">{sale.quantity_bags}</td>
                      <td className="table-cell">{sale.quantity.toFixed(2)}</td>
                      <td className="table-cell">{sale.customer_name || '-'}</td>
                      <td className="table-cell">{sale.sale_price.toFixed(2)}</td>
                      <td className="table-cell">{sale.invoice_no || '-'}</td>
                      <td className="table-cell text-gray-500">{sale.remarks || '-'}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(sale)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
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
              {sales?.map((sale) => (
                <div key={sale.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{sale.bean_type_name}</span>
                    <span className="text-xs text-gray-500">{sale.sale_date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-gray-500">Bags:</span>
                    <span className="text-gray-900 dark:text-gray-100">{sale.quantity_bags}</span>
                    <span className="text-gray-500">Weight:</span>
                    <span className="text-gray-900 dark:text-gray-100">{sale.quantity.toFixed(2)} Viss</span>
                    {sale.customer_name && (
                      <>
                        <span className="text-gray-500">Customer:</span>
                        <span className="text-gray-900 dark:text-gray-100">{sale.customer_name}</span>
                      </>
                    )}
                    {sale.sale_price > 0 && (
                      <>
                        <span className="text-gray-500">Price:</span>
                        <span className="text-gray-900 dark:text-gray-100">{sale.sale_price.toFixed(2)}</span>
                      </>
                    )}
                    {sale.invoice_no && (
                      <>
                        <span className="text-gray-500">Invoice:</span>
                        <span className="text-gray-900 dark:text-gray-100">{sale.invoice_no}</span>
                      </>
                    )}
                  </div>
                  {sale.remarks && (
                    <p className="text-xs text-gray-500">{sale.remarks}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openEditModal(sale)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FiEdit2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Sale" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Record Sale
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Sale" maxWidth="lg">
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
