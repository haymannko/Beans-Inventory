import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { StockAdjustment, CreateAdjustmentRequest, UpdateAdjustmentRequest } from '../types'

interface AdjustmentsFilters {
  bean_type_id?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export function useAdjustments(filters?: AdjustmentsFilters) {
  return useQuery({
    queryKey: ['adjustments', filters],
    queryFn: async () => {
      const response = await apiClient.get<StockAdjustment[]>('/adjustments', { params: filters })
      return response.data
    },
  })
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateAdjustmentRequest) => {
      const response = await apiClient.post<StockAdjustment>('/adjustments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAdjustmentRequest }) => {
      const response = await apiClient.put<StockAdjustment>(`/adjustments/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/adjustments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
