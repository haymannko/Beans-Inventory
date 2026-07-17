import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { FiPackage } from 'react-icons/fi'
import GoogleLogin from '../components/GoogleLogin'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // After Google login, redirect to home
  const handleLoginSuccess = () => {
    toast.success('Login successful!')
    navigate('/')
  }

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
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Use your Google account to sign in
            </p>
            <GoogleLogin />
          </div>
        </div>
      </div>
    </div>
  )
}
