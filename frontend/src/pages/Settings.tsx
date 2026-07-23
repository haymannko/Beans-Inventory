import { useState, useRef } from 'react'
import apiClient from '../api/client'
import toast from 'react-hot-toast'
import { FiLock, FiEye, FiEyeOff, FiDownload, FiUpload, FiAlertTriangle } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // --- Password ---
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // --- Backup ---
  const [isExporting, setIsExporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ message: string; imported: Record<string, number> } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // --- Export Backup ---
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await apiClient.get('/backup/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Backup downloaded successfully')
    } catch {
      toast.error('Failed to export backup')
    } finally {
      setIsExporting(false)
    }
  }

  // --- Import Backup ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('Only .json files are supported')
        return
      }
      setImportFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    if (!window.confirm('This will REPLACE all existing data. Are you sure?')) return

    setIsImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const response = await apiClient.post('/backup/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(response.data)
      toast.success('Backup restored successfully!')
      setImportFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Import failed'
        : 'Import failed'
      toast.error(msg)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account settings</p>
      </div>

      {/* Backup & Restore — Admin only */}
      {isAdmin && (
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <FiDownload className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup & Restore</h2>
          </div>

          {/* Export */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Download a JSON backup of all your data. Save this file in a safe place.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary flex items-center gap-2"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <FiDownload className="w-4 h-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export Backup'}
            </button>
          </div>

          <hr className="border-gray-200 dark:border-gray-700 my-6" />

          {/* Import */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Restore data from a previously exported backup file.
            </p>

            <div className="flex items-center gap-3 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file"
              />
              <label
                htmlFor="backup-file"
                className="btn-secondary flex items-center gap-2 cursor-pointer"
              >
                <FiUpload className="w-4 h-4" />
                {importFile ? importFile.name : 'Choose File'}
              </label>
              {importFile && (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  {isImporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : null}
                  {isImporting ? 'Restoring...' : 'Restore Backup'}
                </button>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mt-3">
              <FiAlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Restoring a backup will <strong>replace all current data</strong>. This cannot be undone.
                Make sure to export a backup of your current data first.
              </p>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  {importResult.message}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {Object.entries(importResult.imported).map(([table, count]) => (
                    <div key={table} className="bg-white dark:bg-gray-800 rounded p-2">
                      <span className="text-gray-500">{table}: </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password */}
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
