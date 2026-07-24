import { useState } from 'react'
import {
  useStockThresholds,
  useStockAlerts,
  useUpsertStockThreshold,
  useUpdateStockThreshold,
  useDeleteStockThreshold,
} from '../hooks/useStockThresholds'
import { useBeanTypes } from '../hooks/useBeanTypes'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import type { StockThresholdResponse } from '../types'
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiBell,
  FiBellOff,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiMail,
  FiEye,
} from 'react-icons/fi'

interface ThresholdForm {
  bean_type_id: string
  bean_type_name: string
  min_stock_bags: number
  min_stock_weight: number
  email_enabled: boolean
  alert_email: string
}

const emptyForm = (): ThresholdForm => ({
  bean_type_id: '',
  bean_type_name: '',
  min_stock_bags: 10,
  min_stock_weight: 500,
  email_enabled: false,
  alert_email: '',
})

export default function StockThresholds() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<ThresholdForm>(emptyForm())

  const { data: thresholds, isLoading } = useStockThresholds({
    search: search || undefined,
    low_stock_only: lowStockOnly || undefined,
  })
  const { data: beanTypes } = useBeanTypes()
  const { data: alertSummary } = useStockAlerts()
  const upsertMutation = useUpsertStockThreshold()
  const updateMutation = useUpdateStockThreshold()
  const deleteMutation = useDeleteStockThreshold()

  const openCreate = () => {
    setForm(emptyForm())
    setIsModalOpen(true)
  }

  const openEdit = (t: StockThresholdResponse) => {
    setForm({
      bean_type_id: t.bean_type_id,
      bean_type_name: t.bean_type_name || '',
      min_stock_bags: t.min_stock_bags,
      min_stock_weight: t.min_stock_weight,
      email_enabled: t.email_enabled,
      alert_email: t.alert_email || '',
    })
    setIsModalOpen(true)
  }

  const handleUpsert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bean_type_id) {
      toast.error('Please select a bean type')
      return
    }
    try {
      await upsertMutation.mutateAsync({
        beanTypeId: form.bean_type_id,
        data: {
          min_stock_bags: form.min_stock_bags,
          min_stock_weight: form.min_stock_weight,
          email_enabled: form.email_enabled,
          alert_email: form.alert_email || null,
        },
      })
      toast.success('Stock threshold saved')
      setIsModalOpen(false)
    } catch (e: unknown) {
      const m =
        e instanceof Error && 'response' in e
          ? (e as any).response?.data?.detail || 'Failed to save'
          : 'Failed to save'
      toast.error(m)
    }
  }

  const handleToggleEmail = async (t: StockThresholdResponse) => {
    if (!isAdmin) return
    try {
      await updateMutation.mutateAsync({
        beanTypeId: t.bean_type_id,
        data: { email_enabled: !t.email_enabled },
      })
      toast.success(t.email_enabled ? 'Email alerts disabled' : 'Email alerts enabled')
    } catch (e: unknown) {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (t: StockThresholdResponse) => {
    if (!isAdmin || !confirm(`Remove threshold for "${t.bean_type_name}"?`)) return
    try {
      await deleteMutation.mutateAsync(t.bean_type_id)
      toast.success('Threshold removed')
    } catch (e: unknown) {
      toast.error('Failed to delete')
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
      case 'warning': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <FiAlertCircle className="w-4 h-4" />
      case 'warning': return <FiAlertTriangle className="w-4 h-4" />
      default: return <FiEye className="w-4 h-4" />
    }
  }

  // Bean types that don't have a threshold yet (for the create dropdown)
  const usedBeanTypeIds = new Set(thresholds?.map((t) => t.bean_type_id) ?? [])
  const availableBeanTypes = beanTypes?.filter((bt) => !usedBeanTypeIds.has(bt.id)) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Thresholds</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Set minimum stock levels to receive low-stock alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertSummary && alertSummary.low_stock_count > 0 && (
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`btn-secondary flex items-center gap-2 ${
                showAlerts ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <FiAlertTriangle className="w-4 h-4 text-amber-500" />
              {alertSummary.low_stock_count} alert{alertSummary.low_stock_count !== 1 ? 's' : ''}
            </button>
          )}
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary flex items-center justify-center gap-2">
              <FiPlus className="w-4 h-4" /> Add Threshold
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary Panel */}
      {showAlerts && alertSummary && alertSummary.alerts.length > 0 && (
        <div className="card border-2 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Low Stock Alerts</h3>
            <span className="text-sm text-gray-500 ml-auto">
              {alertSummary.critical_count} critical · {alertSummary.low_stock_count - alertSummary.critical_count} warning
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertSummary.alerts.map((a) => (
              <div
                key={a.bean_type_id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  a.severity === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : a.severity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <span className={severityColor(a.severity).split(' ').slice(0, 2).join(' ') + ' p-1.5 rounded-full flex-shrink-0'}>
                  {severityIcon(a.severity)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.bean_type_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.current_stock_bags} bags / {a.min_stock_bags} min
                  </p>
                  {a.shortfall_bags > 0 && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">
                      Shortfall: {a.shortfall_bags} bags
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by bean type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Low stock only
        </label>
      </div>

      {/* Thresholds Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !thresholds || thresholds.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FiBell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {search || lowStockOnly
              ? 'No thresholds match your filters'
              : isAdmin
              ? 'No stock thresholds configured. Click "Add Threshold" to set one up.'
              : 'No stock thresholds configured yet.'}
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="table-header">Bean Type</th>
                    <th className="table-header text-center">Min Bags</th>
                    <th className="table-header text-center">Min Weight (kg)</th>
                    <th className="table-header text-center">Current Bags</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-center">Email Alerts</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {thresholds.map((t) => (
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        t.is_low_stock ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="table-cell font-medium">{t.bean_type_name || 'Unknown'}</td>
                      <td className="table-cell text-center">{t.min_stock_bags}</td>
                      <td className="table-cell text-center">{t.min_stock_weight.toFixed(1)}</td>
                      <td className="table-cell text-center font-medium">
                        <span className={t.is_low_stock ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {t.current_stock_bags}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        {t.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <FiAlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        {t.email_enabled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <FiMail className="w-3.5 h-3.5 text-primary-500" />
                            {t.alert_email || 'enabled'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            <FiBellOff className="w-3.5 h-3.5 inline" /> Off
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                            title="Edit threshold"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleToggleEmail(t)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary-600"
                                title={t.email_enabled ? 'Disable email alerts' : 'Enable email alerts'}
                              >
                                {t.email_enabled ? (
                                  <FiBellOff className="w-4 h-4" />
                                ) : (
                                  <FiBell className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(t)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                                title="Remove threshold"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {thresholds.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 space-y-2 ${t.is_low_stock ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t.bean_type_name || 'Unknown'}
                    </span>
                    {t.is_low_stock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <FiAlertTriangle className="w-3 h-3" /> Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        OK
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Min:</span> {t.min_stock_bags} bags / {t.min_stock_weight}kg
                    </div>
                    <div>
                      <span className="text-gray-500">Current:</span>{' '}
                      <span className={t.is_low_stock ? 'text-red-600 font-medium' : ''}>
                        {t.current_stock_bags} bags
                      </span>
                    </div>
                    <div className="col-span-2">
                      {t.email_enabled ? (
                        <span className="text-xs text-gray-500">
                          <FiMail className="w-3 h-3 inline" /> {t.alert_email || 'Alerts enabled'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Email alerts off</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                      >
                        <FiEdit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleToggleEmail(t)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-700 bg-primary-100 dark:bg-primary-900/30 rounded-lg"
                      >
                        {t.email_enabled ? <FiBellOff className="w-3 h-3" /> : <FiBell className="w-3 h-3" />}
                        {t.email_enabled ? 'Disable' : 'Enable'} email
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 rounded-lg"
                      >
                        <FiTrash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upsert Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.bean_type_id && thresholds?.some((t) => t.bean_type_id === form.bean_type_id) ? 'Edit Threshold' : 'Add Threshold'}
        maxWidth="md"
      >
        <form onSubmit={handleUpsert} className="space-y-4">
          {/* Bean type selector (only for new thresholds) */}
          {form.bean_type_id && thresholds?.some((t) => t.bean_type_id === form.bean_type_id) ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bean Type</label>
              <input
                type="text"
                value={form.bean_type_name}
                className="input-field bg-gray-50 dark:bg-gray-700"
                disabled
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bean Type *</label>
              <select
                value={form.bean_type_id}
                onChange={(e) => {
                  const bt = beanTypes?.find((b) => b.id === e.target.value)
                  setForm({
                    ...form,
                    bean_type_id: e.target.value,
                    bean_type_name: bt?.name || '',
                  })
                }}
                className="input-field"
                required
              >
                <option value="">-- Select bean type --</option>
                {availableBeanTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </select>
              {availableBeanTypes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  All bean types already have thresholds configured.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Stock (Bags) *
              </label>
              <input
                type="number"
                min={0}
                value={form.min_stock_bags}
                onChange={(e) => setForm({ ...form, min_stock_bags: Math.max(0, parseInt(e.target.value) || 0) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Weight (kg) *
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.min_stock_weight}
                onChange={(e) => setForm({ ...form, min_stock_weight: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.email_enabled}
                onChange={(e) => setForm({ ...form, email_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              Enable email alerts
            </label>
            {form.email_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alert Email
                </label>
                <input
                  type="email"
                  value={form.alert_email}
                  onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
                  placeholder="email@example.com"
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <FiRefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                'Save Threshold'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
