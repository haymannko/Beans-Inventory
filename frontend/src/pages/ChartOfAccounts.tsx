import { useState } from 'react'
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from '../hooks/useAccounts'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiBook,
} from 'react-icons/fi'
import type { Account, AccountType } from '../types'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
]

const TYPE_CONFIG: Record<AccountType, { color: string; bg: string }> = {
  asset: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  liability: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  equity: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  revenue: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  expense: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
}

export default function ChartOfAccounts() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'asset' as AccountType,
    description: '',
    parent_code: '',
  })

  const { data: accounts, isLoading } = useAccounts({
    search: search || undefined,
    account_type: typeFilter || undefined,
    active_only: false,
  })
  const createMutation = useCreateAccount()
  const updateMutation = useUpdateAccount()
  const deleteMutation = useDeleteAccount()

  const resetForm = () => {
    setFormData({ code: '', name: '', type: 'asset', description: '', parent_code: '' })
  }

  const openEditModal = (acct: Account) => {
    setEditingId(acct.id)
    setFormData({
      code: acct.code,
      name: acct.name,
      type: acct.type,
      description: acct.description || '',
      parent_code: acct.parent_code || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            name: formData.name,
            type: formData.type,
            description: formData.description || undefined,
            parent_code: formData.parent_code || undefined,
          },
        })
        toast.success('Account updated')
        setEditingId(null)
      } else {
        await createMutation.mutateAsync({
          code: formData.code,
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          parent_code: formData.parent_code || undefined,
        })
        toast.success('Account created')
        setIsCreateOpen(false)
      }
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? This cannot be undone.')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Account deleted')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    }
  }

  const formFields = (
    <div className="space-y-4">
      {!editingId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Account Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="input-field"
            placeholder="e.g. 1110"
            required
            pattern="\d{2,6}"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Account Name *
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
          Account Type *
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
          className="input-field"
          required
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-field"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Parent Code
        </label>
        <input
          type="text"
          value={formData.parent_code}
          onChange={(e) => setFormData({ ...formData, parent_code: e.target.value })}
          className="input-field"
          placeholder="e.g. 1000"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage the general ledger chart of accounts</p>
        </div>
        <button onClick={() => { setIsCreateOpen(true); resetForm() }} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          New Account
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field sm:w-44"
        >
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !accounts || accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiBook className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search || typeFilter ? 'No accounts match your filters' : 'No accounts yet'}
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Code</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header text-right">Balance</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {accounts.map((acct) => (
                    <tr key={acct.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell font-mono font-medium">{acct.code}</td>
                      <td className="table-cell font-medium text-gray-900 dark:text-white">{acct.name}</td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_CONFIG[acct.type].bg} ${TYPE_CONFIG[acct.type].color}`}>
                          {acct.type.charAt(0).toUpperCase() + acct.type.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500 max-w-xs truncate">{acct.description || '-'}</td>
                      <td className="table-cell text-right font-medium">
                        <span className={acct.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}>
                          {acct.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(acct)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(acct.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                            title="Delete"
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

            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map((acct) => (
                <div key={acct.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{acct.code}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[acct.type].bg} ${TYPE_CONFIG[acct.type].color}`}>
                      {acct.type.charAt(0).toUpperCase() + acct.type.slice(1)}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">{acct.name}</p>
                  <p className="text-sm text-gray-500">{acct.description || '-'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Balance: {acct.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(acct)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(acct.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="New Account" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formFields}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Create Account</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingId} onClose={() => { setEditingId(null); resetForm() }} title="Edit Account" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
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
