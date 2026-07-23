import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseFilters,
  WarehouseInventoryItem,
  WarehouseTransfer,
  CreateTransferRequest,
  TransferFilters,
} from '../types'

// ─── Warehouses ─────────────────────────────────────────────────────────────

export function useWarehouses(filters?: WarehouseFilters) {
  return useQuery({
    queryKey: ['warehouses', filters],
    queryFn: async () => {
      const response = await apiClient.get<Warehouse[]>('/warehouses', { params: filters })
      return response.data
    },
  })
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: ['warehouses', id],
    queryFn: async () => {
      const response = await apiClient.get<Warehouse>(`/warehouses/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateWarehouseRequest) => {
      const response = await apiClient.post<Warehouse>('/warehouses', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehouseRequest }) => {
      const response = await apiClient.put<Warehouse>(`/warehouses/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<{ message: string; soft_delete: boolean }>(`/warehouses/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useWarehouseInventory(id: string) {
  return useQuery({
    queryKey: ['warehouses', id, 'inventory'],
    queryFn: async () => {
      const response = await apiClient.get<WarehouseInventoryItem[]>(`/warehouses/${id}/inventory`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useWarehouseTransfers(id: string) {
  return useQuery({
    queryKey: ['warehouses', id, 'transfers'],
    queryFn: async () => {
      const response = await apiClient.get<WarehouseTransfer[]>(`/warehouses/${id}/transfers`)
      return response.data
    },
    enabled: !!id,
  })
}

// ─── Transfers ──────────────────────────────────────────────────────────────

export function useTransfers(filters?: TransferFilters) {
  return useQuery({
    queryKey: ['transfers', filters],
    queryFn: async () => {
      const response = await apiClient.get<WarehouseTransfer[]>('/transfers', { params: filters })
      return response.data
    },
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTransferRequest) => {
      const response = await apiClient.post<WarehouseTransfer>('/transfers', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
