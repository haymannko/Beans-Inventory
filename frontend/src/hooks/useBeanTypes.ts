import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { BeanType, CreateBeanTypeRequest } from '../types'

export function useBeanTypes(search?: string) {
  return useQuery({
    queryKey: ['beanTypes', search],
    queryFn: async () => {
      const params = search ? { search } : {}
      const response = await apiClient.get<BeanType[]>('/bean-types', { params })
      return response.data
    },
  })
}

export function useBeanType(id: string) {
  return useQuery({
    queryKey: ['beanTypes', id],
    queryFn: async () => {
      const response = await apiClient.get<BeanType>(`/bean-types/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateBeanType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateBeanTypeRequest) => {
      const response = await apiClient.post<BeanType>('/bean-types', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beanTypes'] })
    },
  })
}

export function useUpdateBeanType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateBeanTypeRequest> }) => {
      const response = await apiClient.put<BeanType>(`/bean-types/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beanTypes'] })
    },
  })
}

export function useDeleteBeanType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/bean-types/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beanTypes'] })
    },
  })
}
