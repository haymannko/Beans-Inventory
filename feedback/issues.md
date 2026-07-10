# Open Issues — Beans Inventory

User feedback → GitHub issues. File each real problem as an issue in your repo,
then list them here. (These are what you'll close in Chapter 6.)

| # | Issue title | GitHub link | From (user/feedback) | Priority |
|---|---|---|---|---|
| 1 | Add purchase order tracking (ERP-style PO workflow) | https://github.com/haymannko/Beans-Inventory/issues/1 | warehouse owner feedback | high |
| 2 | Add supplier/vendor management with contact details | https://github.com/haymannko/Beans-Inventory/issues/2 | warehouse owner feedback | high |
| 3 | Add customer management with purchase history | https://github.com/haymannko/Beans-Inventory/issues/3 | warehouse owner feedback | medium |
| 4 | Add multi-warehouse support with inter-warehouse transfer | https://github.com/haymannko/Beans-Inventory/issues/4 | warehouse owner feedback | medium |
| 5 | Add financial ledger / accounts receivable & payable | https://github.com/haymannko/Beans-Inventory/issues/5 | warehouse owner feedback | high |
| 6 | Add reorder alerts with minimum stock thresholds | https://github.com/haymannko/Beans-Inventory/issues/6 | warehouse owner feedback | medium |
| 7 | Add barcode / QR scanning for bag tracking | https://github.com/haymannko/Beans-Inventory/issues/7 | warehouse owner feedback | low |
| 8 | Add export to PDF reports with Myanmar font support | https://github.com/haymannko/Beans-Inventory/issues/8 | staff feedback | medium |
| 9 | Add ERP system — purchase orders, supplier management, financial ledger | https://github.com/haymannko/Beans-Inventory/issues/9 | warehouse owner feedback | high |
| 10 | Add dark theme / dark mode for low-light warehouse environments | https://github.com/haymannko/Beans-Inventory/issues/10 | staff feedback | medium |
| 11 | Add Gmail login (OAuth2) for quick staff onboarding without password setup | https://github.com/haymannko/Beans-Inventory/issues/11 | warehouse owner feedback | medium |
| 12 | Add pre-commit security hooks — SAST, secret scanning, dep verification | https://github.com/haymannko/Beans-Inventory/issues/12 | security audit | high |
| 13 | Add rate limiting on auth endpoints to prevent brute-force attacks | https://github.com/haymannko/Beans-Inventory/issues/13 | security audit | high |
| 14 | Add input sanitization middleware for XSS prevention | https://github.com/haymannko/Beans-Inventory/issues/14 | security audit | medium |

## Notes

Feedback collected from warehouse owner and staff during Ch-4 user testing.
Top priority items are ERP-style features: PO tracking, supplier management,
and financial ledger. These transform the app from a simple inventory tracker
into a mini-ERP system for Myanmar bean trading businesses.

Security workflow implemented: plan → build → agent review → SAST + secret scan → dep verify → human review → commit. Pre-commit hook, CI security job, and security agent added.
