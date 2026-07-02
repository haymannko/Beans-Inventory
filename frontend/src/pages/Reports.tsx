import { useState } from 'react'
import { useReport } from '../hooks/useReports'
import { useBeanTypes } from '../hooks/useBeanTypes'
import toast from 'react-hot-toast'
import { FiDownload, FiFileText } from 'react-icons/fi'
import apiClient from '../api/client'

export default function Reports() {
  const [reportType, setReportType] = useState('daily')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [beanTypeId, setBeanTypeId] = useState('')

  const { data: report, isLoading, refetch } = useReport({
    report_type: reportType,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    bean_type_id: beanTypeId || undefined,
  })

  const { data: beanTypes } = useBeanTypes()

  const handleExportExcel = async () => {
    try {
      const response = await apiClient.get('/reports/export/excel', {
        params: {
          report_type: reportType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          bean_type_id: beanTypeId || undefined,
        },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${reportType}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Excel report downloaded')
    } catch {
      toast.error('Failed to export Excel')
    }
  }

  const handleExportPDF = async () => {
    try {
      const response = await apiClient.get('/reports/export/pdf', {
        params: {
          report_type: reportType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          bean_type_id: beanTypeId || undefined,
        },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${reportType}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to export PDF')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Generate and export inventory reports</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input-field"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {reportType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bean Type (Optional)
            </label>
            <select
              value={beanTypeId}
              onChange={(e) => setBeanTypeId(e.target.value)}
              className="input-field"
            >
              <option value="">All Bean Types</option>
              {beanTypes?.map((bt) => (
                <option key={bt.id} value={bt.id}>
                  {bt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={() => refetch()} className="btn-primary">
            Generate Report
          </button>
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FiDownload className="w-4 h-4" />
            Excel
          </button>
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2">
            <FiDownload className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Report Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Arrivals Summary */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <FiFileText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Arrivals</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Count</span>
                <span className="font-medium">{report.data.arrivals.count}</span>
              </div>
              {report.data.arrivals.bags_by_type.map((item) => (
                <div key={item.bean_type_name} className="flex justify-between">
                  <span className="text-gray-500">{item.bean_type_name}</span>
                  <span className="font-medium">{item.quantity_bags} bags</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-gray-500">Total Cost</span>
                <span className="font-medium">{report.data.arrivals.total_cost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Sales Summary */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <FiFileText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Sales</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Count</span>
                <span className="font-medium">{report.data.sales.count}</span>
              </div>
              {report.data.sales.bags_by_type.map((item) => (
                <div key={item.bean_type_name} className="flex justify-between">
                  <span className="text-gray-500">{item.bean_type_name}</span>
                  <span className="font-medium">{item.quantity_bags} bags</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-medium">{report.data.sales.total_revenue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Adjustments Summary */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                <FiFileText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Adjustments</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Count</span>
                <span className="font-medium">{report.data.adjustments.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">{report.data.adjustments.total_quantity_viss.toFixed(2)} Viss</span>
              </div>
              {report.data.adjustments.details.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-gray-500">{item.bean_type_name}</span>
                  <span className={`font-medium ${item.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.adjustment_type === 'increase' ? '+' : '-'}{item.quantity_viss.toFixed(2)} Viss
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Period Info */}
          <div className="col-span-full">
            <div className="card bg-gray-50 dark:bg-gray-700/50">
              <p className="text-sm text-gray-500">
                Report Period: {report.start_date} to {report.end_date}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12 text-gray-500">
          <FiFileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Select filters and click "Generate Report" to view results</p>
        </div>
      )}
    </div>
  )
}
