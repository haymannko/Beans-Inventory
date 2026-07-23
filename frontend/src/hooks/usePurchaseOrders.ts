import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  PurchaseOrderStatusUpdate,
  ReceiveItemsRequest,
  PurchaseOrderFilters,
} from '../types'

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: ['purchaseOrders', filters],
    queryFn: async () => {
      const response = await apiClient.get<PurchaseOrder[]>('/purchase-orders', { params: filters })
      return response.data
    },
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchaseOrders', id],
    queryFn: async () => {
      const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderRequest) => {
      const response = await apiClient.post<PurchaseOrder>('/purchase-orders', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderRequest }) => {
      const response = await apiClient.put<PurchaseOrder>(`/purchase-orders/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchase-orders/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PurchaseOrderStatusUpdate }) => {
      const response = await apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReceiveItemsRequest }) => {
      const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['arrivals'] })
    },
  })
}
