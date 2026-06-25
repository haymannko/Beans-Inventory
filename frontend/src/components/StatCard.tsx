import { ReactNode } from 'react'
import { IconType } from 'react-icons'

interface StatCardProps {
  title: string
  value: string | number | ReactNode
  icon: IconType
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
  subtitle?: string
}

const colorClasses = {
  green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
}

export default function StatCard({ title, value, icon: Icon, color = 'green', subtitle }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
