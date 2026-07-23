import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type {
  TrialBalanceResponse,
  IncomeStatementResponse,
  BalanceSheetResponse,
  ReceivablePayableItem,
} from '../types'

export function useTrialBalance(asOfDate?: string) {
  return useQuery({
    queryKey: ['trialBalance', asOfDate],
    queryFn: async () => {
      const response = await apiClient.get<TrialBalanceResponse>('/financial/trial-balance', {
        params: asOfDate ? { as_of_date: asOfDate } : undefined,
      })
      return response.data
    },
  })
}

export function useIncomeStatement(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['incomeStatement', startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get<IncomeStatementResponse>(
        '/financial/reports/income-statement',
        { params: { start_date: startDate, end_date: endDate } },
      )
      return response.data
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useBalanceSheet(asOfDate?: string) {
  return useQuery({
    queryKey: ['balanceSheet', asOfDate],
    queryFn: async () => {
      const response = await apiClient.get<BalanceSheetResponse>('/financial/reports/balance-sheet', {
        params: asOfDate ? { as_of_date: asOfDate } : undefined,
      })
      return response.data
    },
  })
}

export function useAccountsReceivable() {
  return useQuery({
    queryKey: ['receivables'],
    queryFn: async () => {
      const response = await apiClient.get<ReceivablePayableItem[]>('/financial/receivables')
      return response.data
    },
  })
}

export function useAccountsPayable() {
  return useQuery({
    queryKey: ['payables'],
    queryFn: async () => {
      const response = await apiClient.get<ReceivablePayableItem[]>('/financial/payables')
      return response.data
    },
  })
}
