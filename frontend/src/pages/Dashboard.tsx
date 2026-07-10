import { useDashboard } from '../hooks/useDashboard'
import StatCard from '../components/StatCard'
import {
  FiPackage,
  FiTruck,
  FiDollarSign,
  FiArchive,
} from 'react-icons/fi'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function Dashboard() {
  const { data: dashboard, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!dashboard) {
    return <div className="text-center text-gray-500">Failed to load dashboard data</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of your bean inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bean Types"
          value={dashboard.total_bean_types}
          icon={FiPackage}
          color="blue"
        />
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Stock</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {dashboard.total_current_stock_bags} bags
              </p>
              {dashboard.storage_by_warehouse.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dashboard.storage_by_warehouse.map((w) => (
                    <span
                      key={w.warehouse_name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {w.quantity_bags} in {w.warehouse_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400">
              <FiArchive className="w-6 h-6" />
            </div>
          </div>
        </div>
        <StatCard
          title="Today's Arrivals"
          value={`${dashboard.today_arrivals_bags} bags`}
          icon={FiTruck}
          color="yellow"
        />
        <StatCard
          title="Today's Sales"
          value={`${dashboard.today_sales_bags} bags`}
          icon={FiDollarSign}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Bean Type */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Stock by Bean Type (Bags)</h3>
          <div className="space-y-3">
            {(() => {
              const maxStock = Math.max(...dashboard.stock_by_type.map(d => d.total_stock_bags), 1)
              return dashboard.stock_by_type.map((item, index) => (
                <div key={item.bean_type_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate font-medium">{item.bean_type_name}</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium ml-3 flex-shrink-0">
                      {item.total_stock_bags}
                    </span>
                  </div>
                  <div className="ml-5 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.total_stock_bags / maxStock) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                        minWidth: item.total_stock_bags > 0 ? '8px' : '0',
                      }}
                    />
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Monthly Sales (Bags)</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.monthly_sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value} bags`} />
                <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Arrivals */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Monthly Arrivals (Bags)</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.monthly_arrivals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value} bags`} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {dashboard.recent_transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No recent transactions</p>
            ) : (
              dashboard.recent_transactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      tx.type === 'arrival'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {tx.type === 'arrival' ? (
                      <FiTruck className="w-4 h-4" />
                    ) : (
                      <FiDollarSign className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.bean_type as string}</p>
                    <p className="text-xs text-gray-500">{tx.type as string}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{tx.quantity as number} bags</p>
                    <p className="text-xs text-gray-500">{tx.date as string}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
