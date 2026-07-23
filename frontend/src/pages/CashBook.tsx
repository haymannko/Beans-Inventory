import { useState } from 'react'
import {
  useCashBook,
  useCashBookBalance,
  useCreateCashBookEntry,
  useDeleteCashBookEntry,
} from '../hooks/useCashBook'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiTrash2,
  FiSearch,
  FiDollarSign,
  FiArrowDown,
  FiArrowUp,
  FiRefreshCw,
} from 'react-icons/fi'

export default function CashBook() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'receipt' as 'receipt' | 'payment',
    amount: '',
    description: '',
    counterparty: '',
    payment_method: '',
    notes: '',
  })

  const { data: entries, isLoading } = useCashBook({
    search: search || undefined,
    transaction_type: typeFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })
  const { data: balance } = useCashBookBalance()
  const createMutation = useCreateCashBookEntry()
  const deleteMutation = useDeleteCashBookEntry()

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'receipt',
      amount: '',
      description: '',
      counterparty: '',
      payment_method: '',
      notes: '',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        transaction_date: formData.transaction_date,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        counterparty: formData.counterparty || undefined,
        payment_method: formData.payment_method || undefined,
        notes: formData.notes || undefined,
      })
      toast.success('Cash book entry created')
      setIsCreateOpen(false)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cash book entry?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Entry deleted')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Book</h1>
          <p className="text-gray-500 dark:text-gray-400">Record and track cash receipts and payments</p>
        </div>
        <button onClick={() => { setIsCreateOpen(true); resetForm() }} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Opening Balance</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {(balance?.opening_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Receipts</p>
          <p className="text-xl font-bold text-green-600 flex items-center gap-1">
            <FiArrowDown className="w-4 h-4" />
            {(balance?.total_receipts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
          <p className="text-xl font-bold text-red-600 flex items-center gap-1">
            <FiArrowUp className="w-4 h-4" />
            {(balance?.total_payments || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Closing Balance</p>
          <p className={`text-xl font-bold flex items-center gap-1 ${(balance?.closing_balance || 0) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
            <FiDollarSign className="w-4 h-4" />
            {(balance?.closing_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="input-field sm:w-36"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="input-field sm:w-36"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field sm:w-36"
        >
          <option value="">All</option>
          <option value="receipt">Receipts</option>
          <option value="payment">Payments</option>
        </select>
        <button
          onClick={() => { setSearch(''); setTypeFilter(''); setStartDate(''); setEndDate('') }}
          className="btn-secondary flex items-center gap-1"
          title="Reset filters"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiDollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search || typeFilter || startDate ? 'No entries match your filters' : 'No cash book entries yet'}
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Entry #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Counterparty</th>
                    <th className="table-header">Method</th>
                    <th className="table-header text-right">Receipts</th>
                    <th className="table-header text-right">Payments</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell font-mono font-medium">{entry.entry_number}</td>
                      <td className="table-cell">{entry.transaction_date}</td>
                      <td className="table-cell max-w-xs truncate">{entry.description}</td>
                      <td className="table-cell">{entry.counterparty || '-'}</td>
                      <td className="table-cell text-xs">{entry.payment_method || '-'}</td>
                      <td className="table-cell text-right font-medium text-green-600">
                        {entry.transaction_type === 'receipt' ? entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="table-cell text-right font-medium text-red-600">
                        {entry.transaction_type === 'payment' ? entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{entry.entry_number}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.transaction_type === 'receipt'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {entry.transaction_type === 'receipt' ? <FiArrowDown className="w-3 h-3" /> : <FiArrowUp className="w-3 h-3" />}
                      {entry.transaction_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">{entry.description}</p>
                  <p className="text-xs text-gray-500">{entry.transaction_date} | {entry.counterparty || '-'} | {entry.payment_method || '-'}</p>
                  <p className="text-sm font-medium">{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  {entry.notes && <p className="text-xs text-gray-500 italic">{entry.notes}</p>}
                  <button onClick={() => handleDelete(entry.id)} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                    <FiTrash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="New Cash Book Entry" maxWidth="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as 'receipt' | 'payment' })}
                className="input-field"
                required
              >
                <option value="receipt">Receipt (Money In)</option>
                <option value="payment">Payment (Money Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input-field"
                min="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="input-field"
              >
                <option value="">Select method</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="mobile_payment">Mobile Payment</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={2}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Counterparty</label>
              <input
                type="text"
                value={formData.counterparty}
                onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
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
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Create Entry</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
