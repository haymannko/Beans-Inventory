import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type {
  StockThresholdResponse,
  StockThresholdCreate,
  StockThresholdUpdate,
  StockAlertSummary,
} from '../types'

export function useStockThresholds(params?: {
  search?: string
  low_stock_only?: boolean
  skip?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['stockThresholds', params],
    queryFn: async () => {
      const response = await apiClient.get<StockThresholdResponse[]>('/stock-thresholds', { params })
      return response.data
    },
  })
}

export function useStockThreshold(beanTypeId: string) {
  return useQuery({
    queryKey: ['stockThresholds', beanTypeId],
    queryFn: async () => {
      const response = await apiClient.get<StockThresholdResponse>(
        `/stock-thresholds/${beanTypeId}`
      )
      return response.data
    },
    enabled: !!beanTypeId,
  })
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['stockThresholds', 'alerts'],
    queryFn: async () => {
      const response = await apiClient.get<StockAlertSummary>(
        '/stock-thresholds/alerts'
      )
      return response.data
    },
    refetchInterval: 60_000, // refresh every minute
  })
}

export function useUpsertStockThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      beanTypeId,
      data,
    }: {
      beanTypeId: string
      data: StockThresholdCreate
    }) => {
      const response = await apiClient.put<StockThresholdResponse>(
        `/stock-thresholds/${beanTypeId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockThresholds'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateStockThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      beanTypeId,
      data,
    }: {
      beanTypeId: string
      data: StockThresholdUpdate
    }) => {
      const response = await apiClient.patch<StockThresholdResponse>(
        `/stock-thresholds/${beanTypeId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockThresholds'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteStockThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (beanTypeId: string) => {
      await apiClient.delete(`/stock-thresholds/${beanTypeId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockThresholds'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
