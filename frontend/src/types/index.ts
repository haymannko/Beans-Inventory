export interface User {
  id: string
  username: string
  role: 'admin' | 'staff'
  email?: string
  avatar_url?: string
  auth_provider?: string
  created_at: string
}

export interface BeanType {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Arrival {
  id: string
  bean_type_id: string
  bean_type_name?: string
  quantity_bags: number
  weight_kg: number
  supplier_name: string | null
  purchase_price: number
  transport_fee: number | string
  labor_fee: number | string
  arrival_date: string
  remarks: string | null
  created_by: string
  created_at: string
}

export interface Sale {
  id: string
  bean_type_id: string
  bean_type_name?: string
  quantity_bags: number
  quantity: number
  customer_name: string | null
  sale_price: number
  invoice_no: string | null
  sale_date: string
  remarks: string | null
  created_by: string
  created_at: string
}

export interface Storage {
  id: string
  bean_type_id: string
  bean_type_name?: string
  quantity_bags: number
  quantity: number
  warehouse_name: string | null
  storage_date: string
  notes: string | null
  created_by: string
  created_at: string
}

export interface StockAdjustment {
  id: string
  bean_type_id: string
  bean_type_name?: string
  quantity: number
  adjustment_type: 'increase' | 'decrease'
  reason: string
  adjustment_date: string
  created_by: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface WeightMaster {
  id: string
  bean_name: string
  weight: number
  created_at: string
  updated_at: string
}

export interface CreateWeightMasterRequest {
  bean_name: string
  weight: number
}

export interface UpdateWeightMasterRequest {
  bean_name?: string
  weight?: number
}

export interface StockByBeanType {
  bean_type_id: string
  bean_type_name: string
  total_stock: number
  total_stock_bags: number
  storage_bags: number
}

export interface StorageByWarehouse {
  warehouse_name: string
  quantity_bags: number
}

export interface DashboardData {
  total_bean_types: number
  total_current_stock: number
  total_current_stock_bags: number
  total_storage_bags: number
  storage_by_warehouse: StorageByWarehouse[]
  today_arrivals: number
  today_arrivals_bags: number
  today_sales: number
  today_sales_bags: number
  low_stock_alerts: StockByBeanType[]
  recent_transactions: Record<string, unknown>[]
  stock_by_type: StockByBeanType[]
  monthly_sales: { month: string; total: number }[]
  monthly_arrivals: { month: string; total: number }[]
}

export interface ReportData {
  report_type: string
  start_date: string
  end_date: string
  data: {
    arrivals: { count: number; bags_by_type: { bean_type_name: string; quantity_bags: number }[]; total_cost: number }
    sales: { count: number; bags_by_type: { bean_type_name: string; quantity_bags: number }[]; total_revenue: number }
    adjustments: { count: number; total_quantity_viss: number; details: { bean_type_name: string; adjustment_type: string; quantity_viss: number }[] }
  }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface CreateBeanTypeRequest {
  name: string
  description?: string
}

export interface CreateArrivalRequest {
  bean_type_id: string
  quantity_bags: number
  weight_kg: number
  supplier_name?: string
  purchase_price: number
  transport_fee: number | string
  labor_fee: number | string
  arrival_date: string
  remarks?: string
}

export interface UpdateArrivalRequest {
  bean_type_id?: string
  quantity_bags?: number
  weight_kg?: number
  supplier_name?: string
  purchase_price?: number
  transport_fee?: number | string
  labor_fee?: number | string
  arrival_date?: string
  remarks?: string
}

export interface CreateSaleRequest {
  bean_type_id: string
  quantity_bags: number
  quantity: number
  customer_name?: string
  sale_price: number
  invoice_no?: string
  sale_date: string
  remarks?: string
}

export interface UpdateSaleRequest {
  bean_type_id?: string
  quantity_bags?: number
  quantity?: number
  customer_name?: string
  sale_price?: number
  invoice_no?: string
  sale_date?: string
  remarks?: string
}

export interface CreateStorageRequest {
  bean_type_id: string
  quantity_bags: number
  quantity: number
  warehouse_name?: string
  storage_date: string
  notes?: string
}

export interface UpdateStorageRequest {
  bean_type_id?: string
  quantity_bags?: number
  quantity?: number
  warehouse_name?: string
  storage_date?: string
  notes?: string
}

export interface CreateAdjustmentRequest {
  bean_type_id: string
  quantity: number
  adjustment_type: 'increase' | 'decrease'
  reason: string
  adjustment_date: string
}

export interface UpdateAdjustmentRequest {
  bean_type_id?: string
  quantity?: number
  adjustment_type?: 'increase' | 'decrease'
  reason?: string
  adjustment_date?: string
}
