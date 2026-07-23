# Supplier Management — Implementation Plan (Issue #3)

## Overview

Create a full CRUD supplier management feature that tracks company info, contact details, and purchase history. Also integrate suppliers with existing Purchase Orders (add `supplier_id` FK) and Arrivals.

---

## 1. Backend — Model (`backend/app/models/supplier.py`)

New model `Supplier` with fields:
| Field | Type | Constraints |
|-------|------|-------------|
| id | String(36) PK | UUID default |
| company_name | String(200) | unique, not null, indexed |
| contact_person | String(200) | nullable |
| phone | String(50) | nullable |
| email | String(200) | nullable |
| address | Text | nullable |
| notes | Text | nullable |
| is_active | Boolean | default True |
| created_at | DateTime(tz) | server_default=func.now() |
| updated_at | DateTime(tz) | server_default=func.now(), onupdate |

---

## 2. Backend — Schema (`backend/app/schemas/supplier.py`)

- `SupplierCreate` — company_name required, others optional (with min_length validation)
- `SupplierUpdate` — all optional with `@model_validator` ensuring at least one field
- `SupplierResponse` — includes `purchase_order_count: int` and `recent_purchase_orders: list[dict]` for purchase history
- All exported from `schemas/__init__.py`

---

## 3. Backend — Router (`backend/app/routers/suppliers.py`)

Endpoints:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/suppliers` | List with search (company_name, contact_person, phone, email ilike), pagination (skip/limit), active filter |
| GET | `/api/suppliers/{id}` | Single supplier with purchase history (count + recent 5 POs) |
| POST | `/api/suppliers` | Create (company_name required, unique validation) |
| PUT | `/api/suppliers/{id}` | Update |
| DELETE | `/api/suppliers/{id}` | Soft-delete (set is_active=False) if has POs; hard delete if no POs |

Purchase history is queried from the `purchase_orders` table grouped/ordered by supplier.

---

## 4. Backend — Migration (`backend/alembic/versions/004_create_suppliers.py`)

- Create `suppliers` table
- Add `supplier_id` FK column to `purchase_orders` (nullable, FK → suppliers.id)
- Set `supplier_id` from existing `supplier_name` where possible (best-effort match)

---

## 5. Purchase Order Integration

- Add `supplier_id: Mapped[str | None]` FK field to PurchaseOrder model
- Keep `supplier_name` as denormalized cache (set automatically from Supplier.company_name when supplier_id is provided)
- Update PO schemas to accept `supplier_id` alongside `supplier_name`
- Update PO router to auto-populate `supplier_name` from supplier_id if provided

---

## 6. Frontend — Types (`frontend/src/types/index.ts`)

Add:
```typescript
export interface Supplier {
  id: string
  company_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  purchase_order_count?: number
  recent_purchase_orders?: Array<{...}>
}
// + CreateSupplierRequest, UpdateSupplierRequest, SupplierFilters
```

---

## 7. Frontend — Hooks (`frontend/src/hooks/useSuppliers.ts`)

React Query hooks:
- `useSuppliers(filters?)` — list with query key `['suppliers', filters]`
- `useSupplier(id)` — single with purchase history
- `useCreateSupplier()` — invalidates `['suppliers']`
- `useUpdateSupplier()` — invalidates `['suppliers']`
- `useDeleteSupplier()` — invalidates `['suppliers']`

---

## 8. Frontend — Page (`frontend/src/pages/Suppliers.tsx`)

Full CRUD page following PurchaseOrders.tsx pattern:
- Desktop table + mobile cards
- Search bar searching company_name, contact_person, phone, email
- Create/Edit modal with fields
- Delete with confirmation
- Expandable row showing purchase history (count + recent orders)
- Empty state, loading state, error handling

---

## 9. Frontend — Integration

- `App.tsx` — add route: `<Route path="suppliers" element={<Suppliers />} />`
- `Sidebar.tsx` — add nav item: `{ name: 'Suppliers', href: '/suppliers', icon: FiUsers }`
- Import `FiUsers` from `react-icons/fi`

---

## 10. Tests (`backend/tests/test_suppliers.py`)

~15 tests covering:
- Create supplier (minimal, full details, duplicate company_name)
- List suppliers (no filter, search, pagination)
- Get single supplier (includes purchase order count)
- Update supplier
- Delete supplier (with POs → soft delete, without POs → hard delete)
- Reactivate a soft-deleted supplier
- Unauthorized access
- Validation (empty company_name)

---

## 11. Documentation

Update `README.md` with:
- New supplier management section
- API endpoints table
- Supplier-PO relationship explanation

---

## Implementation Order

1. Backend model + migration
2. Schemas
3. Router
4. PO integration (model FK + router updates)
5. Tests
6. Frontend types + hooks
7. Frontend page
8. App/Sidebar registration
9. Run tests, fix issues
10. Commit & PR
