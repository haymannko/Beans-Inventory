import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { Storage, CreateStorageRequest, UpdateStorageRequest } from '../types'

interface StoragesFilters {
  bean_type_id?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export function useStorages(filters?: StoragesFilters) {
  return useQuery({
    queryKey: ['storages', filters],
    queryFn: async () => {
      const response = await apiClient.get<Storage[]>('/storages', { params: filters })
      return response.data
    },
  })
}

export function useCreateStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateStorageRequest) => {
      const response = await apiClient.post<Storage>('/storages', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStorageRequest }) => {
      const response = await apiClient.put<Storage>(`/storages/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/storages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
