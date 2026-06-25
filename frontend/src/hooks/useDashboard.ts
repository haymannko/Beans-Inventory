import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { DashboardData } from '../types'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardData>('/dashboard')
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })
}
