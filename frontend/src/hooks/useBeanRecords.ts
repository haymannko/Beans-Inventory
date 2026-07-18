import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { BeanRecord, CreateBeanRecordRequest, UpdateBeanRecordRequest } from '../types'

interface BeanRecordFilters {
  bean_type_id?: string
  start_date?: string
  end_date?: string
  customer?: string
  skip?: number
  limit?: number
}

export function useBeanRecords(filters?: BeanRecordFilters) {
  return useQuery({
    queryKey: ['beanRecords', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      if (filters?.bean_type_id) params.bean_type_id = filters.bean_type_id
      if (filters?.start_date) params.start_date = filters.start_date
      if (filters?.end_date) params.end_date = filters.end_date
      if (filters?.customer) params.customer = filters.customer
      if (filters?.skip !== undefined) params.skip = filters.skip
      if (filters?.limit !== undefined) params.limit = filters.limit
      const response = await apiClient.get<BeanRecord[]>('/bean-records', { params })
      return response.data
    },
  })
}

export function useCreateBeanRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateBeanRecordRequest) => {
      const response = await apiClient.post<BeanRecord>('/bean-records', data)
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beanRecords'] }),
  })
}

export function useUpdateBeanRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBeanRecordRequest }) => {
      const response = await apiClient.put<BeanRecord>(`/bean-records/${id}`, data)
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beanRecords'] }),
  })
}

export function useDeleteBeanRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/bean-records/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beanRecords'] }),
  })
}
