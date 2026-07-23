import { useState } from 'react'
import { useTrialBalance } from '../hooks/useFinancialReports'
import { FiRefreshCw, FiCheckCircle, FiXCircle } from 'react-icons/fi'

export default function TrialBalance() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])

  const { data: tb, isLoading, refetch } = useTrialBalance(asOfDate || undefined)

  const isBalanced = tb && Math.abs(tb.total_debit - tb.total_credit) < 0.01

  // Group by account type
  const grouped = tb?.rows.reduce(
    (acc, row) => {
      const group = row.account_type
      if (!acc[group]) acc[group] = []
      acc[group].push(row)
      return acc
    },
    {} as Record<string, typeof tb.rows>,
  ) || {}

  const TYPE_LABELS: Record<string, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expenses',
  }

  const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trial Balance</h1>
          <p className="text-gray-500 dark:text-gray-400">Verify that total debits equal total credits</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">As of Date:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="input-field w-44"
          />
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>

        {tb && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
            isBalanced
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {isBalanced ? (
              <><FiCheckCircle className="w-4 h-4" /> Balanced</>
            ) : (
              <><FiXCircle className="w-4 h-4" /> Not Balanced</>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : !tb || tb.rows.length === 0 ? (
        <div className="card px-4 py-8 text-center text-gray-500">
          No journal entries found for trial balance
        </div>
      ) : (
        <div className="space-y-6">
          {TYPE_ORDER.map((type) => {
            const groupRows = grouped[type] || []
            if (groupRows.length === 0) return null
            return (
              <div key={type} className="card overflow-hidden p-0">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {TYPE_LABELS[type] || type} ({groupRows.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="table-header">Code</th>
                        <th className="table-header">Account Name</th>
                        <th className="table-header text-right">Debit</th>
                        <th className="table-header text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {groupRows.map((row) => (
                        <tr key={row.account_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="table-cell font-mono text-xs">{row.account_code}</td>
                          <td className="table-cell">{row.account_name}</td>
                          <td className="table-cell text-right font-medium text-red-600">
                            {row.total_debit > 0 ? row.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="table-cell text-right font-medium text-green-600">
                            {row.total_credit > 0 ? row.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {/* Totals */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="table-cell" colSpan={2}>Totals</td>
                    <td className="table-cell text-right text-red-600">
                      {tb.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="table-cell text-right text-green-600">
                      {tb.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
