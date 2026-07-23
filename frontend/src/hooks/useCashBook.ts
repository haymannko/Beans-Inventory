import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type {
  CashBookEntry,
  CashBookFilters,
  CashBookBalance,
  CreateCashBookEntryRequest,
  UpdateCashBookEntryRequest,
} from '../types'

export function useCashBook(filters?: CashBookFilters) {
  return useQuery({
    queryKey: ['cashBook', filters],
    queryFn: async () => {
      const response = await apiClient.get<CashBookEntry[]>('/financial/cash-book', { params: filters })
      return response.data
    },
  })
}

export function useCashBookEntry(id: string) {
  return useQuery({
    queryKey: ['cashBook', id],
    queryFn: async () => {
      const response = await apiClient.get<CashBookEntry>(`/financial/cash-book/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCashBookBalance(asOfDate?: string) {
  return useQuery({
    queryKey: ['cashBook', 'balance', asOfDate],
    queryFn: async () => {
      const response = await apiClient.get<CashBookBalance>('/financial/cash-book/balance', {
        params: asOfDate ? { as_of_date: asOfDate } : undefined,
      })
      return response.data
    },
  })
}

export function useCreateCashBookEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateCashBookEntryRequest) => {
      const response = await apiClient.post<CashBookEntry>('/financial/cash-book', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashBook'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateCashBookEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCashBookEntryRequest }) => {
      const response = await apiClient.put<CashBookEntry>(`/financial/cash-book/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashBook'] })
    },
  })
}

export function useDeleteCashBookEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/financial/cash-book/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashBook'] })
    },
  })
}
