import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type {
  JournalEntry,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
  JournalEntryFilters,
} from '../types'

export function useJournalEntries(filters?: JournalEntryFilters) {
  return useQuery({
    queryKey: ['journalEntries', filters],
    queryFn: async () => {
      const response = await apiClient.get<JournalEntry[]>('/financial/journal-entries', { params: filters })
      return response.data
    },
  })
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ['journalEntries', id],
    queryFn: async () => {
      const response = await apiClient.get<JournalEntry>(`/financial/journal-entries/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateJournalEntryRequest) => {
      const response = await apiClient.post<JournalEntry>('/financial/journal-entries', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trialBalance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateJournalEntryRequest }) => {
      const response = await apiClient.put<JournalEntry>(`/financial/journal-entries/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trialBalance'] })
    },
  })
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/financial/journal-entries/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trialBalance'] })
    },
  })
}
