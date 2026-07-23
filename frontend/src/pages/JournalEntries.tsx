import { useState } from 'react'
import {
  useJournalEntries,
  useCreateJournalEntry,
  useDeleteJournalEntry,
} from '../hooks/useJournalEntries'
import { useAccounts } from '../hooks/useAccounts'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiTrash2,
  FiSearch,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiXCircle,
  FiDollarSign,
} from 'react-icons/fi'

interface LineFormEntry {
  account_id: string
  debit: string
  credit: string
  description: string
}

const emptyLine = (): LineFormEntry => ({
  account_id: '',
  debit: '',
  credit: '',
  description: '',
})

const ENTRY_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'arrival', label: 'Arrival' },
  { value: 'sale', label: 'Sale' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'adjustment', label: 'Adjustment' },
]

export default function JournalEntries() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    entry_type: 'manual',
  })
  const [lines, setLines] = useState<LineFormEntry[]>([emptyLine(), emptyLine()])

  const { data: entries, isLoading } = useJournalEntries({
    search: search || undefined,
    entry_type: typeFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })
  const { data: accounts } = useAccounts({ active_only: true })
  const createMutation = useCreateJournalEntry()
  const deleteMutation = useDeleteJournalEntry()

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      entry_type: 'manual',
    })
    setLines([emptyLine(), emptyLine()])
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isBalanced) {
      toast.error('Total debits must equal total credits')
      return
    }

    try {
      const validLines = lines
        .filter((l) => l.account_id && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
        .map((l) => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || undefined,
        }))

      if (validLines.length < 2) {
        toast.error('Add at least two lines (debit and credit)')
        return
      }

      await createMutation.mutateAsync({
        entry_date: formData.entry_date,
        description: formData.description,
        entry_type: formData.entry_type || 'manual',
        lines: validLines,
      })
      toast.success('Journal entry created')
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
    if (!confirm('Delete this journal entry? This cannot be undone.')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Journal entry deleted')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal Entries</h1>
          <p className="text-gray-500 dark:text-gray-400">Double-entry accounting journal records</p>
        </div>
        <button onClick={() => { setIsCreateOpen(true); resetForm() }} className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4" />
          New Journal Entry
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entry number or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="input-field sm:w-40"
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="input-field sm:w-40"
          placeholder="End date"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field sm:w-40"
        >
          <option value="">All Types</option>
          {ENTRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiBookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search || typeFilter || startDate ? 'No entries match your filters' : 'No journal entries yet'}
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
                    <th className="table-header">Type</th>
                    <th className="table-header text-right">Debit</th>
                    <th className="table-header text-right">Credit</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((je) => {
                    const jeDebit = je.lines.reduce((s, l) => s + l.debit, 0)
                    const jeCredit = je.lines.reduce((s, l) => s + l.credit, 0)
                    return (
                      <tbody key={je.id} className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="table-cell font-mono font-medium">{je.entry_number}</td>
                          <td className="table-cell">{je.entry_date}</td>
                          <td className="table-cell max-w-xs truncate">{je.description}</td>
                          <td className="table-cell">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {je.entry_type || 'manual'}
                            </span>
                          </td>
                          <td className="table-cell text-right font-medium text-red-600">
                            {jeDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="table-cell text-right font-medium text-green-600">
                            {jeCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(je.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                                title="Delete"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setExpandedId(expandedId === je.id ? null : je.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                title={expandedId === je.id ? 'Collapse' : 'Expand'}
                              >
                                {expandedId === je.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === je.id && (
                          <tr>
                            <td colSpan={7} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
                              <div className="text-sm space-y-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b dark:border-gray-700">
                                      <th className="text-left py-1 pr-2">Account</th>
                                      <th className="text-right px-2">Debit</th>
                                      <th className="text-right px-2">Credit</th>
                                      <th className="text-left pl-2">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {je.lines.map((line) => (
                                      <tr key={line.id} className="border-b dark:border-gray-700/50">
                                        <td className="py-1 pr-2">
                                          <span className="font-medium">{line.account_code}</span>
                                          {' — '}{line.account_name || line.account_id}
                                        </td>
                                        <td className="text-right px-2 text-red-600">
                                          {line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td className="text-right px-2 text-green-600">
                                          {line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td className="pl-2 text-gray-500">{line.description || ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((je) => (
                <div key={je.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{je.entry_number}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {je.entry_type || 'manual'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{je.description}</p>
                  <p className="text-sm">{je.entry_date}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-medium">
                      Dr: {je.lines.reduce((s, l) => s + l.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-green-600 font-medium">
                      Cr: {je.lines.reduce((s, l) => s + l.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === je.id ? null : je.id)}
                    className="flex items-center gap-1 text-xs text-gray-500"
                  >
                    {expandedId === je.id ? <FiChevronUp /> : <FiChevronDown />}
                    {expandedId === je.id ? 'Hide lines' : 'Show lines'}
                  </button>
                  {expandedId === je.id && (
                    <div className="pt-1 space-y-1 text-xs">
                      {je.lines.map((line) => (
                        <div key={line.id} className="flex justify-between py-1 px-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <span className="flex-1">{line.account_code} - {line.account_name}</span>
                          {line.debit > 0 && <span className="text-red-600 w-20 text-right">Dr {line.debit.toFixed(2)}</span>}
                          {line.credit > 0 && <span className="text-green-600 w-20 text-right">Cr {line.credit.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(je.id)}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <FiTrash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm() }} title="New Journal Entry" maxWidth="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entry Date *</label>
              <input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={formData.entry_type}
                onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                className="input-field"
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
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

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Journal Lines * <span className="text-gray-500 font-normal">(debits must equal credits)</span>
              </label>
              <button
                type="button"
                onClick={() => setLines([...lines, emptyLine()])}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-2 mb-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <select
                    value={line.account_id}
                    onChange={(e) => {
                      const newLines = [...lines]
                      newLines[idx] = { ...newLines[idx], account_id: e.target.value }
                      setLines(newLines)
                    }}
                    className="input-field text-sm flex-[2]"
                    required
                  >
                    <option value="">Select account</option>
                    {accounts?.map((acct) => (
                      <option key={acct.id} value={acct.id}>
                        {acct.code} - {acct.name} ({acct.type})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={(e) => {
                      const newLines = [...lines]
                      newLines[idx] = { ...newLines[idx], debit: e.target.value }
                      setLines(newLines)
                    }}
                    className="input-field text-sm w-full sm:w-28"
                    min="0"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Credit"
                    value={line.credit}
                    onChange={(e) => {
                      const newLines = [...lines]
                      newLines[idx] = { ...newLines[idx], credit: e.target.value }
                      setLines(newLines)
                    }}
                    className="input-field text-sm w-full sm:w-28"
                    min="0"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => {
                      const newLines = [...lines]
                      newLines[idx] = { ...newLines[idx], description: e.target.value }
                      setLines(newLines)
                    }}
                    className="input-field text-sm flex-1"
                  />
                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-2 shrink-0"
                    >
                      <FiXCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm px-1">
              <span className="font-medium">Total Debit: <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>{totalDebit.toFixed(2)}</span></span>
              <span className="font-medium">Total Credit: <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>{totalCredit.toFixed(2)}</span></span>
              {isBalanced && totalDebit > 0 ? (
                <span className="text-green-600 flex items-center gap-1"><FiDollarSign className="w-3 h-3" /> Balanced</span>
              ) : totalDebit > 0 || totalCredit > 0 ? (
                <span className="text-red-600">Not balanced (diff: {Math.abs(totalDebit - totalCredit).toFixed(2)})</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsCreateOpen(false); resetForm() }} className="btn-secondary w-full sm:w-auto">Cancel</button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={!isBalanced}>
              Create Journal Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
