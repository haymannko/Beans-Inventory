import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ReportData } from '../types'

interface ReportFilters {
  report_type: string
  start_date?: string
  end_date?: string
  bean_type_id?: string
}

export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', filters],
    queryFn: async () => {
      const response = await apiClient.get<ReportData>('/reports', { params: filters })
      return response.data
    },
    enabled: !!filters.report_type,
  })
}

export function useExportExcel(filters: ReportFilters) {
  return useQuery({
    queryKey: ['exportExcel', filters],
    queryFn: async () => {
      const response = await apiClient.get('/reports/export/excel', {
        params: filters,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${filters.report_type}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return response.data
    },
    enabled: false,
  })
}

export function useExportPDF(filters: ReportFilters) {
  return useQuery({
    queryKey: ['exportPDF', filters],
    queryFn: async () => {
      const response = await apiClient.get('/reports/export/pdf', {
        params: filters,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${filters.report_type}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return response.data
    },
    enabled: false,
  })
}
