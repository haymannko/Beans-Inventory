import { useState } from 'react'
import {
  useIncomeStatement,
  useBalanceSheet,
  useAccountsReceivable,
  useAccountsPayable,
} from '../hooks/useFinancialReports'
import {
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiUsers,
} from 'react-icons/fi'

type ReportTab = 'pl' | 'balance-sheet' | 'receivables' | 'payables'

export default function FinancialReports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('pl')

  // P&L date range
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const [plStart, setPlStart] = useState(firstDay.toISOString().split('T')[0])
  const [plEnd, setPlEnd] = useState(now.toISOString().split('T')[0])

  // Balance sheet date
  const [bsDate, setBsDate] = useState(now.toISOString().split('T')[0])

  const { data: pl, isLoading: plLoading, refetch: plRefetch } = useIncomeStatement(plStart, plEnd)
  const { data: bs, isLoading: bsLoading, refetch: bsRefetch } = useBalanceSheet(bsDate || undefined)
  const { data: receivables, isLoading: arLoading, refetch: arRefetch } = useAccountsReceivable()
  const { data: payables, isLoading: apLoading, refetch: apRefetch } = useAccountsPayable()

  const TABS: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'pl', label: 'Profit & Loss', icon: <FiTrendingUp className="w-4 h-4" /> },
    { key: 'balance-sheet', label: 'Balance Sheet', icon: <FiDollarSign className="w-4 h-4" /> },
    { key: 'receivables', label: 'Accounts Receivable', icon: <FiUsers className="w-4 h-4" /> },
    { key: 'payables', label: 'Accounts Payable', icon: <FiTrendingDown className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Income statement, balance sheet, and AR/AP summaries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profit & Loss */}
      {activeTab === 'pl' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
              <input type="date" value={plStart} onChange={(e) => setPlStart(e.target.value)} className="input-field w-40" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
              <input type="date" value={plEnd} onChange={(e) => setPlEnd(e.target.value)} className="input-field w-40" />
            </div>
            <button onClick={() => plRefetch()} className="btn-secondary flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {plLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : pl ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenues */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">Revenue</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pl.revenues.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No revenue accounts</p>
                  ) : pl.revenues.map((r) => (
                    <div key={r.account_id} className="flex justify-between px-4 py-2 text-sm">
                      <span><span className="font-mono text-xs text-gray-400">{r.account_code}</span> {r.account_name}</span>
                      <span className="font-medium text-green-600">{r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 bg-green-50 dark:bg-green-900/10 font-bold text-sm">
                    <span>Total Revenue</span>
                    <span className="text-green-700">{pl.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Expenses</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pl.expenses.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No expense accounts</p>
                  ) : pl.expenses.map((e) => (
                    <div key={e.account_id} className="flex justify-between px-4 py-2 text-sm">
                      <span><span className="font-mono text-xs text-gray-400">{e.account_code}</span> {e.account_name}</span>
                      <span className="font-medium text-red-600">{e.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 bg-red-50 dark:bg-red-900/10 font-bold text-sm">
                    <span>Total Expenses</span>
                    <span className="text-red-700">{pl.total_expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Net Income */}
              <div className="lg:col-span-2 card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Net Income for Period</p>
                    <p className="text-lg font-bold">{plStart} to {plEnd}</p>
                  </div>
                  <p className={`text-2xl font-bold ${pl.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pl.net_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <span className="text-sm ml-1">{pl.net_income >= 0 ? '(Profit)' : '(Loss)'}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === 'balance-sheet' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">As of:</label>
            <input type="date" value={bsDate} onChange={(e) => setBsDate(e.target.value)} className="input-field w-40" />
            <button onClick={() => bsRefetch()} className="btn-secondary flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {bsLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : bs ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Assets */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Assets</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bs.assets.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No asset accounts</p>
                  ) : bs.assets.map((a) => (
                    <div key={a.account_id} className="flex justify-between px-4 py-2 text-sm">
                      <span><span className="font-mono text-xs text-gray-400">{a.account_code}</span> {a.account_name}</span>
                      <span className="font-medium">{a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-900/10 font-bold text-sm">
                    <span>Total Assets</span>
                    <span>{bs.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Liabilities</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bs.liabilities.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No liability accounts</p>
                  ) : bs.liabilities.map((l) => (
                    <div key={l.account_id} className="flex justify-between px-4 py-2 text-sm">
                      <span><span className="font-mono text-xs text-gray-400">{l.account_code}</span> {l.account_name}</span>
                      <span className="font-medium">{l.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/10 font-bold text-sm">
                    <span>Total Liabilities</span>
                    <span>{bs.total_liabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Equity</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bs.equity.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No equity accounts</p>
                  ) : bs.equity.map((e) => (
                    <div key={e.account_id} className="flex justify-between px-4 py-2 text-sm">
                      <span><span className="font-mono text-xs text-gray-400">{e.account_code}</span> {e.account_name}</span>
                      <span className="font-medium">{e.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 bg-purple-50 dark:bg-purple-900/10 font-bold text-sm">
                    <span>Total Equity</span>
                    <span>{bs.total_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="lg:col-span-3 card">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Assets</p>
                    <p className="text-lg font-bold text-blue-600">{bs.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Liabilities + Equity</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {(bs.total_liabilities + bs.total_equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Difference</p>
                    <p className={`text-lg font-bold ${Math.abs(bs.total_assets - bs.total_liabilities - bs.total_equity) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {(bs.total_assets - bs.total_liabilities - bs.total_equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* AR */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => arRefetch()} className="btn-secondary flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          {arLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : !receivables || receivables.length === 0 ? (
            <div className="card px-4 py-8 text-center text-gray-500">No outstanding receivables</div>
          ) : (
            <div className="grid gap-4">
              {receivables.map((ar) => (
                <div key={ar.account_id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{ar.account_name}</p>
                      <p className="text-xs font-mono text-gray-400">{ar.account_code}</p>
                    </div>
                    <p className="text-lg font-bold text-red-600">{ar.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  {ar.recent_transactions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 mb-1">Recent Transactions:</p>
                      {ar.recent_transactions.map((t) => (
                        <div key={t.id} className="flex justify-between text-xs py-0.5">
                          <span className="font-mono">{t.entry_number}</span>
                          <span className="text-gray-500">{t.entry_date}</span>
                          <span className="flex-1 ml-2 truncate">{t.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AP */}
      {activeTab === 'payables' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => apRefetch()} className="btn-secondary flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          {apLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          ) : !payables || payables.length === 0 ? (
            <div className="card px-4 py-8 text-center text-gray-500">No outstanding payables</div>
          ) : (
            <div className="grid gap-4">
              {payables.map((ap) => (
                <div key={ap.account_id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{ap.account_name}</p>
                      <p className="text-xs font-mono text-gray-400">{ap.account_code}</p>
                    </div>
                    <p className="text-lg font-bold text-yellow-600">{ap.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  {ap.recent_transactions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 mb-1">Recent Transactions:</p>
                      {ap.recent_transactions.map((t) => (
                        <div key={t.id} className="flex justify-between text-xs py-0.5">
                          <span className="font-mono">{t.entry_number}</span>
                          <span className="text-gray-500">{t.entry_date}</span>
                          <span className="flex-1 ml-2 truncate">{t.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
