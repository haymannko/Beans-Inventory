import { useState } from 'react'
import apiClient from '../api/client'
import toast from 'react-hot-toast'
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setIsLoading(true)
    try {
      await apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
      toast.success('Password changed successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed'
        : 'Failed'
      toast.error(msg)
    } finally { setIsLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account settings</p>
      </div>
      <div className="max-w-md">
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600"><FiLock className="w-5 h-5" /></div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field pr-10" required />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500" aria-label={showCurrent ? 'Hide password' : 'Show password'}>{showCurrent ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" minLength={6} required />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500" aria-label={showNew ? 'Hide password' : 'Show password'}>{showNew ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" minLength={6} required />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
