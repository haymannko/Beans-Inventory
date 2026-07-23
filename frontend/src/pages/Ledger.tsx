import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { useJournalEntries } from '../hooks/useJournalEntries'
import { FiSearch, FiBook } from 'react-icons/fi'
import type { AccountType } from '../types'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
]

export default function Ledger() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const { data: accounts } = useAccounts({
    search: search || undefined,
    account_type: typeFilter || undefined,
    active_only: true,
  })

  const { data: journalEntries } = useJournalEntries({
    account_id: selectedAccountId || undefined,
    limit: 50,
  })

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">General Ledger</h1>
        <p className="text-gray-500 dark:text-gray-400">View account balances and transaction history</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account list */}
        <div className="lg:col-span-1 card overflow-hidden p-0">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Accounts</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
            {!accounts || accounts.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500 text-center">No accounts found</p>
            ) : accounts.map((acct) => (
              <button
                key={acct.id}
                onClick={() => setSelectedAccountId(acct.id)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedAccountId === acct.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-600' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${selectedAccountId === acct.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                      <span className="font-mono text-xs text-gray-400">{acct.code}</span> {acct.name}
                    </p>
                    <p className="text-xs text-gray-500">{acct.type}</p>
                  </div>
                  <p className={`font-medium text-sm ${
                    acct.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'
                  }`}>
                    {acct.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2 card overflow-hidden p-0">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {selectedAccount ? (
                <><span className="font-mono">{selectedAccount.code}</span> — {selectedAccount.name}</>
              ) : (
                'Select an account to view transactions'
              )}
            </h3>
          </div>

          {!selectedAccountId ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <FiBook className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              Select an account from the list
            </div>
          ) : !journalEntries || journalEntries.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No transactions for this account</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Entry #</th>
                    <th className="table-header">Description</th>
                    <th className="table-header text-right">Debit</th>
                    <th className="table-header text-right">Credit</th>
                    <th className="table-header text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {journalEntries.map((je) => {
                    const line = je.lines.find((l) => l.account_id === selectedAccountId)
                    const lineDebit = line?.debit || 0
                    const lineCredit = line?.credit || 0
                    return (
                      <tr key={je.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="table-cell">{je.entry_date}</td>
                        <td className="table-cell font-mono text-xs">{je.entry_number}</td>
                        <td className="table-cell max-w-xs truncate">{je.description}</td>
                        <td className="table-cell text-right text-red-600 font-medium">
                          {lineDebit > 0 ? lineDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="table-cell text-right text-green-600 font-medium">
                          {lineCredit > 0 ? lineCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="table-cell text-right font-medium">
                          {(lineDebit - lineCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedAccount && (
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Current Balance</span>
              <span className={`font-bold text-base ${
                selectedAccount.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'
              }`}>
                {selectedAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
