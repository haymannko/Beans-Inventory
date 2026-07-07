import { NavLink } from 'react-router-dom'
import {
  FiGrid,
  FiPackage,
  FiTruck,
  FiDollarSign,
  FiArchive,
  FiSliders,
  FiFileText,
  FiUsers,
  FiSettings,
  FiShield,
  FiList,
  FiX,
} from 'react-icons/fi'

const navigation = [
  { name: 'Dashboard', href: '/', icon: FiGrid },
  { name: 'Bean Types', href: '/bean-types', icon: FiPackage },
  { name: 'အသားအလေးချိန်စာရင်း', href: '/weight-master', icon: FiList },
  { name: 'Arrivals', href: '/arrivals', icon: FiTruck },
  { name: 'Sales', href: '/sales', icon: FiDollarSign },
  { name: 'Storage', href: '/storage', icon: FiArchive },
  { name: 'Adjustments', href: '/adjustments', icon: FiSliders },
  { name: 'Reports', href: '/reports', icon: FiFileText },
  { name: 'Users', href: '/users', icon: FiUsers },
  { name: 'Settings', href: '/settings', icon: FiSettings },
  { name: 'Voucher', href: '/bouncher', icon: FiShield },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FiPackage className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">Beans</span>
        </div>

        <button
          onClick={onClose}
          className="lg:hidden p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close sidebar"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <nav className="p-4 space-y-1 overflow-y-auto flex-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`
            }
            onClick={onClose}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
