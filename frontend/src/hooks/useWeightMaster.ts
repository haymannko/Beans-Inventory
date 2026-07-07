import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { WeightMaster, CreateWeightMasterRequest } from '../types'

export function useWeightMasterList(search?: string) {
  return useQuery({
    queryKey: ['weightMaster', search],
    queryFn: async () => {
      const params = search ? { search } : {}
      const response = await apiClient.get<WeightMaster[]>('/weight-master', { params })
      return response.data
    },
  })
}

export function useWeightMaster(id: string) {
  return useQuery({
    queryKey: ['weightMaster', id],
    queryFn: async () => {
      const response = await apiClient.get<WeightMaster>(`/weight-master/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateWeightMaster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateWeightMasterRequest) => {
      const response = await apiClient.post<WeightMaster>('/weight-master', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightMaster'] })
    },
  })
}

export function useUpdateWeightMaster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWeightMasterRequest> }) => {
      const response = await apiClient.put<WeightMaster>(`/weight-master/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightMaster'] })
    },
  })
}

export function useDeleteWeightMaster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/weight-master/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightMaster'] })
    },
  })
}
