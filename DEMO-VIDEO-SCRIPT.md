# Demo Video Script — Beans Inventory

**Duration:** 6:00 (max)
**Live URL:** https://beans-app-iota.vercel.app
**Backend:** https://beans-api-m6e1.onrender.com
**Author:** haymannko

---

## Full Script — Follow This Beat-by-Beat

---

### HOOK (0:05 – 0:35) — 30 seconds

> Myanmar bean warehouses run on paper notebooks and Excel spreadsheets. Warehouse owners lose records, make manual counting errors, and have zero real-time visibility into stock. When a customer calls asking "how much mung bean do you have left?" — they flip through pages and guess. We built Beans Inventory to replace all of that with a fast, accurate digital system.

---

### SOLUTION (0:35 – 1:05) — 30 seconds

> Beans Inventory is a full-stack inventory management system built for Myanmar bean trading businesses. It tracks arrivals, sales, storage, and stock adjustments in real time. With role-based access for admin and staff, one-click PDF and Excel reports, and a traditional Myanmar voucher printer — it replaces the entire paper workflow with a single dashboard. Free to run on Vercel and Render.

---

### LIVE DEMO (1:05 – 4:30) — 3 minutes 25 seconds

> **\[SCREEN: Login page at beans-app-iota.vercel.app/login\]**
>
> Let's walk through a real warehouse day.

#### Step 1 — Login (1:05 – 1:25)

> We log in as staff. Each user has a role — admin sees everything, staff sees what they need.
>
> **\[TYPE: staff / staff123 → Click Login\]**
>
> **What the viewer sees:** Clean login form → JWT auth → redirects to dashboard.

#### Step 2 — Dashboard (1:25 – 1:50)

> The dashboard shows live stock levels, recent activity, and alerts. Right now we can see total arrivals, sales, and current balances across all bean types.
>
> **\[SHOW: Dashboard with charts and stats cards\]**
>
> **What the viewer sees:** Real-time numbers, bar charts for stock distribution, recent transactions list.

#### Step 3 — Record an Arrival (1:50 – 2:30)

> A truck arrives with 50 bags of green mung bean. We record it in seconds.
>
> **\[CLICK: Arrivals → Add New\]**
> **\[TYPE: Date = today, Bean Type = mung bean, Quantity = 50 bags, Weight = 1250 kg, Purchase Price = 450,000 MMK, Storage = Warehouse A\]**
> **\[CLICK: Save\]**
>
> Stock just went up. Let's verify.
>
> **\[NAVIGATE: Dashboard → show mung bean balance increased\]**
>
> **What the viewer sees:** Form submission → instant stock update → dashboard reflects new balance.

#### Step 4 — Record a Sale (2:30 – 3:10)

> A customer orders 20 bags. We record the sale — the system won't let us sell more than we have.
>
> **\[CLICK: Sales → Add New\]**
> **\[TYPE: Customer = Yangon Trading, Bean Type = mung bean, Quantity = 20 bags, Sale Price = 520,000 MMK\]**
> **\[CLICK: Save\]**
>
> Watch — if I try to sell 200 bags that we don't have:
>
> **\[TRY: Sell 200 bags → shows validation error "Insufficient stock"\]**
>
> The system protects against overselling. Stock auto-decrements on every sale.
>
> **What the viewer sees:** Sale form → stock validation error → success on valid sale.

#### Step 5 — Stock Adjustment (3:10 – 3:35)

> Physical count shows 2 bags were damaged. We adjust with a reason — and it's logged.
>
> **\[CLICK: Adjustments → Add New\]**
> **\[TYPE: Bean Type = mung bean, Type = Decrease, Quantity = 2, Reason = "Damaged during transport"\]**
> **\[CLICK: Save\]**
>
> Every adjustment is recorded in the audit log with who did it and when.
>
> **What the viewer sees:** Adjustment form → audit log entry appears.

#### Step 6 — Reports & Export (3:35 – 4:10)

> Now let's generate a report. Warehouse owner needs a weekly summary for their accountant.
>
> **\[CLICK: Reports → Select "Weekly" → Generate\]**
> **\[SHOW: Report table with arrivals, sales, adjustments, running balance\]**
>
> One click to export — PDF with Myanmar font support, or Excel.
>
> **\[CLICK: Export PDF → show PDF preview with ပဲတီစိမ်း in Myanmar script\]**
> **\[CLICK: Export Excel → show spreadsheet download\]**
>
> **What the viewer sees:** Report generation → PDF with Myanmar text → Excel download.

#### Step 7 — Boucher / Voucher Printer (4:10 – 4:30)

> Finally — the boucher. This is the traditional Myanmar transaction voucher with the red border. One click to print for the customer.
>
> **\[CLICK: Boucher → select a transaction → Show print preview\]**
>
> **What the viewer sees:** Ornate red-bordered voucher form with auto-calculated totals, ready to print.

---

### TECH HIGHLIGHT (4:30 – 5:15) — 45 seconds

> The hardest part was the stock formula. Current stock = arrivals + storage + adjustments(increase) minus sales minus adjustments(decrease). Every mutation has to be atomic — no race conditions when two staff members record at the same time. We solved it with SQLAlchemy async transactions and database-level constraints.
>
> We built this entire project using **Claude Code** — Anthropic's AI coding assistant. From database models to React components to Docker configs, Claude helped write, debug, and iterate across the full stack. The AI handled boilerplate and patterns so we could focus on business logic and UX.

---

### WHAT'S NEXT (5:15 – 5:45) — 30 seconds

> For real warehouse owners, the next step is multi-warehouse support — tracking stock across multiple locations with inter-warehouse transfers. We're also looking at barcode scanning for faster arrivals, and SMS notifications when stock drops below a threshold. The foundation is solid — now it's about scaling to real daily use.

---

### OUTRO (5:45 – 6:00) — 15 seconds

> That's Beans Inventory. Replacing paper notebooks with a fast, accurate digital system for Myanmar bean warehouses. Thanks for watching.

---

## Recording Checklist

- [ ] Script read aloud once — check it fits 6 minutes
- [ ] Live URL works: https://beans-app-iota.vercel.app
- [ ] Login credentials ready: staff / staff123
- [ ] Browser incognito, clean tabs, no personal data visible
- [ ] Screen at 1080p, UI zoomed for readability
- [ ] Timer visible during recording
- [ ] Mic close, quiet room
- [ ] Dry run once before recording

## Upload

- [ ] YouTube (Unlisted): Title = `Vibe Code Tours — haymannko — Beans Inventory`
- [ ] Link pasted into `DEMO.md`, `report.md`, and team video sheet
- [ ] Incognito test: link works without login
