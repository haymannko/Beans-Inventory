import { useState } from 'react'
import { useTransfers, useCreateTransfer } from '../hooks/useWarehouses'
import { useWarehouses } from '../hooks/useWarehouses'
import { useBeanTypes } from '../hooks/useBeanTypes'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiArrowRight, FiRefreshCw } from 'react-icons/fi'

export default function Transfers() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    bean_type_id: '',
    quantity_bags: '',
    quantity: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { data: transfers, isLoading } = useTransfers()
  const { data: warehouses } = useWarehouses({ active_only: true })
  const { data: beanTypes } = useBeanTypes()
  const createMutation = useCreateTransfer()

  const resetForm = () => {
    setFormData({
      from_warehouse_id: '', to_warehouse_id: '', bean_type_id: '',
      quantity_bags: '', quantity: '',
      transfer_date: new Date().toISOString().split('T')[0], notes: '',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      toast.error('Source and destination warehouses must be different')
      return
    }
    try {
      await createMutation.mutateAsync({
        from_warehouse_id: formData.from_warehouse_id,
        to_warehouse_id: formData.to_warehouse_id,
        bean_type_id: formData.bean_type_id,
        quantity_bags: parseInt(formData.quantity_bags) || 0,
        quantity: parseFloat(formData.quantity) || 0,
        transfer_date: formData.transfer_date,
        notes: formData.notes || undefined,
      })
      toast.success('Transfer created successfully')
      setIsModalOpen(false)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as any).response?.data?.detail || 'Failed to create transfer'
        : 'Failed to create transfer'
      toast.error(msg)
    }
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Warehouse *</label>
          <select value={formData.from_warehouse_id} onChange={(e) => setFormData({ ...formData, from_warehouse_id: e.target.value })} className="input-field" required>
            <option value="">Select source</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Warehouse *</label>
          <select value={formData.to_warehouse_id} onChange={(e) => setFormData({ ...formData, to_warehouse_id: e.target.value })} className="input-field" required>
            <option value="">Select destination</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bean Type *</label>
          <select value={formData.bean_type_id} onChange={(e) => setFormData({ ...formData, bean_type_id: e.target.value })} className="input-field" required>
            <option value="">Select bean type</option>
            {beanTypes?.map((bt) => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Date *</label>
          <input type="date" value={formData.transfer_date} onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bags</label>
          <input type="number" value={formData.quantity_bags} onChange={(e) => setFormData({ ...formData, quantity_bags: e.target.value })} className="input-field" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (Viss)</label>
          <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="input-field" min="0" step="0.01" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouse Transfers</h1>
          <p className="text-gray-500 dark:text-gray-400">Move inventory between warehouses</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" /> New Transfer
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : !transfers || transfers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiArrowRight className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No transfers yet
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">From</th>
                    <th className="table-header">To</th>
                    <th className="table-header">Bean Type</th>
                    <th className="table-header text-center">Bags</th>
                    <th className="table-header text-right">Weight</th>
                    <th className="table-header">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell">{t.transfer_date}</td>
                      <td className="table-cell font-medium">{t.from_warehouse_name}</td>
                      <td className="table-cell font-medium">{t.to_warehouse_name}</td>
                      <td className="table-cell">{t.bean_type_name || '-'}</td>
                      <td className="table-cell text-center">{t.quantity_bags}</td>
                      <td className="table-cell text-right">{t.quantity.toFixed(2)}</td>
                      <td className="table-cell text-gray-500">{t.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {transfers.map((t) => (
                <div key={t.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t.transfer_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-gray-900 dark:text-white">{t.from_warehouse_name}</span>
                    <FiArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{t.to_warehouse_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-gray-500">Bean:</span>
                    <span className="text-gray-900 dark:text-gray-100">{t.bean_type_name || '-'}</span>
                    <span className="text-gray-500">Bags:</span>
                    <span className="text-gray-900 dark:text-gray-100">{t.quantity_bags}</span>
                    <span className="text-gray-500">Weight:</span>
                    <span className="text-gray-900 dark:text-gray-100">{t.quantity.toFixed(2)} Viss</span>
                  </div>
                  {t.notes && <p className="text-xs text-gray-500">{t.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title="New Transfer" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              {createMutation.isPending ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
