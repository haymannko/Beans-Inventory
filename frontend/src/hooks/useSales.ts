import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { Sale, CreateSaleRequest, UpdateSaleRequest } from '../types'

interface SalesFilters {
  bean_type_id?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export function useSales(filters?: SalesFilters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const response = await apiClient.get<Sale[]>('/sales', { params: filters })
      return response.data
    },
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateSaleRequest) => {
      const response = await apiClient.post<Sale>('/sales', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSaleRequest }) => {
      const response = await apiClient.put<Sale>(`/sales/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
