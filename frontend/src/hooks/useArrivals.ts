import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { Arrival, CreateArrivalRequest, UpdateArrivalRequest } from '../types'

interface ArrivalsFilters {
  bean_type_id?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export function useArrivals(filters?: ArrivalsFilters) {
  return useQuery({
    queryKey: ['arrivals', filters],
    queryFn: async () => {
      const response = await apiClient.get<Arrival[]>('/arrivals', { params: filters })
      return response.data
    },
  })
}

export function useCreateArrival() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateArrivalRequest) => {
      const response = await apiClient.post<Arrival>('/arrivals', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateArrival() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateArrivalRequest }) => {
      const response = await apiClient.put<Arrival>(`/arrivals/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteArrival() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/arrivals/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
