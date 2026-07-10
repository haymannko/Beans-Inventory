# ERP Validator Skill

Validates ERP-style features in the Beans Inventory system — ensuring data integrity, business rules, and proper audit trails for enterprise resource planning modules.

## When to Use

- Adding or modifying purchase order (PO) tracking
- Implementing supplier/vendor management
- Building financial ledger (accounts receivable & payable)
- Validating stock movements against PO records
- Checking data consistency across ERP modules

## Validation Checklist

### Purchase Order Tracking
- PO has unique PO number, supplier reference, date, status (draft/pending/received/cancelled)
- PO line items link to bean_type with quantity and unit price
- PO status transitions follow valid workflow: draft → pending → received → closed
- Received quantity cannot exceed ordered quantity
- Partial receipts are tracked with remaining quantity

### Supplier / Vendor Management
- Supplier has unique name, contact person, phone, email, address
- Suppliers can be linked to multiple POs
- Soft delete — deactivate supplier, never hard delete if POs exist
- Search by name, contact, or phone number

### Financial Ledger
- Each PO payment creates a ledger entry (debit/credit)
- Accounts Payable: tracks what we owe suppliers
- Accounts Receivable: tracks what customers owe us
- Balance = sum of debits - sum of credits
- All ledger entries are immutable once posted (append-only)
- Ledger entries reference their source (PO ID, sale ID, adjustment ID)

### Data Integrity Rules
- Stock formula: `current_stock = arrivals + storage + adjustments_increase - sales - adjustments_decrease`
- Cannot receive more than PO ordered quantity
- Cannot sell more than available stock
- Cannot decrease stock below zero via adjustments
- Every stock movement must have an audit_log entry

## Trigger

Activate when:
- User asks to validate ERP features
- Building PO, supplier, or ledger endpoints
- Debugging stock discrepancies
- Reviewing business logic for enterprise modules

## Command

```
use erp-validator skill to validate [feature name]
```

Or invoke via Claude Code:
```
@erp-validator validate the PO receiving workflow
```

## Output Format

```markdown
### Validation Result: [Feature Name]

**Status:** ✅ PASS / ❌ FAIL / ⚠️ WARNING

**Checks:**
- [ ] Rule 1 — description
- [x] Rule 2 — description (passed)
- [ ] Rule 3 — description

**Issues Found:**
- Issue 1: description + suggested fix

**Audit Trail:**
- What was checked
- Data sources used
```
