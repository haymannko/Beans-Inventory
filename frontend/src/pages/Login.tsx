import { FiPackage } from 'react-icons/fi'
import GoogleLogin from '../components/GoogleLogin'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <FiPackage className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Beans Inventory</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to manage your inventory
          </p>
        </div>

        <div className="card">
          <GoogleLogin />
        </div>
      </div>
    </div>
  )
}
