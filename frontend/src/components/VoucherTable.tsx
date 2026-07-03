export interface VoucherRow {
  id: string
  no: number
  beanType: string
  bags: number
  weightViss: number
  pricePerViss: number
  totalAmount: number
}

interface VoucherTableProps {
  rows: VoucherRow[]
  onRowsChange: (rows: VoucherRow[]) => void
}

export default function VoucherTable({ rows, onRowsChange }: VoucherTableProps) {
  const addRow = () => {
    const newRow: VoucherRow = {
      id: crypto.randomUUID(),
      no: rows.length + 1,
      beanType: '',
      bags: 0,
      weightViss: 0,
      pricePerViss: 0,
      totalAmount: 0,
    }
    onRowsChange([...rows, newRow])
  }

  const removeRow = (id: string) => {
    if (rows.length <= 1) return
    const filtered = rows.filter((r) => r.id !== id)
    onRowsChange(filtered.map((r, i) => ({ ...r, no: i + 1 })))
  }

  const updateRow = (id: string, field: keyof VoucherRow, value: string | number) => {
    const updated = rows.map((r) => {
      if (r.id !== id) return r
      const row = { ...r, [field]: value }
      // auto-calculate total
      if (field === 'weightViss' || field === 'pricePerViss' || field === 'bags') {
        const w = field === 'weightViss' ? Number(value) : r.weightViss
        const p = field === 'pricePerViss' ? Number(value) : r.pricePerViss
        row.totalAmount = w * p
      }
      return row
    })
    onRowsChange(updated)
  }

  const grandTotal = rows.reduce((sum, r) => sum + r.totalAmount, 0)
  const totalBags = rows.reduce((sum, r) => sum + r.bags, 0)
  const totalWeight = rows.reduce((sum, r) => sum + r.weightViss, 0)

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="table-header w-10 text-center">No</th>
              <th className="table-header">ပဲအမျိုးအစား</th>
              <th className="table-header text-right">အိတ်ရေ</th>
              <th className="table-header text-right">အလေးချိန် (ပိဿာ)</th>
              <th className="table-header text-right">တစ်ပိဿာနှုန်း</th>
              <th className="table-header text-right">ကျသင့်ငွေ</th>
              <th className="table-header w-14 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="table-cell text-center font-medium">{row.no}</td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={row.beanType}
                    onChange={(e) => updateRow(row.id, 'beanType', e.target.value)}
                    className="input-field py-1 w-full min-w-[120px]"
                    placeholder="ပဲတီစိမ်း"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="number"
                    value={row.bags || ''}
                    onChange={(e) => updateRow(row.id, 'bags', e.target.value)}
                    className="input-field py-1 w-20 text-right"
                    min="0"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="number"
                    value={row.weightViss || ''}
                    onChange={(e) => updateRow(row.id, 'weightViss', e.target.value)}
                    className="input-field py-1 w-24 text-right"
                    min="0"
                    step="0.01"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="number"
                    value={row.pricePerViss || ''}
                    onChange={(e) => updateRow(row.id, 'pricePerViss', e.target.value)}
                    className="input-field py-1 w-24 text-right"
                    min="0"
                  />
                </td>
                <td className="table-cell text-right font-medium">
                  {row.totalAmount.toLocaleString()}
                </td>
                <td className="table-cell text-center">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600"
                    title="Remove row"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
              <td colSpan={2} className="table-header text-right">စုစုပေါင်း</td>
              <td className="table-cell text-right">{totalBags}</td>
              <td className="table-cell text-right">{totalWeight.toFixed(2)}</td>
              <td className="table-cell"></td>
              <td className="table-cell text-right">{grandTotal.toLocaleString()}</td>
              <td className="table-cell"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">#{row.no}</span>
              <button
                onClick={() => removeRow(row.id)}
                className="text-red-500 text-xs hover:underline"
              >
                ဖျက်မည်
              </button>
            </div>
            <input
              type="text"
              value={row.beanType}
              onChange={(e) => updateRow(row.id, 'beanType', e.target.value)}
              className="input-field py-1.5 w-full"
              placeholder="ပဲအမျိုးအစား"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">အိတ်ရေ</label>
                <input
                  type="number" value={row.bags || ''}
                  onChange={(e) => updateRow(row.id, 'bags', e.target.value)}
                  className="input-field py-1.5 w-full" min="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">အလေးချိန် (ပိဿာ)</label>
                <input
                  type="number" value={row.weightViss || ''}
                  onChange={(e) => updateRow(row.id, 'weightViss', e.target.value)}
                  className="input-field py-1.5 w-full" min="0" step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">တစ်ပိဿာနှုန်း</label>
                <input
                  type="number" value={row.pricePerViss || ''}
                  onChange={(e) => updateRow(row.id, 'pricePerViss', e.target.value)}
                  className="input-field py-1.5 w-full" min="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">ကျသင့်ငွေ</label>
                <div className="input-field py-1.5 w-full bg-gray-50 dark:bg-gray-700 text-right font-medium">
                  {row.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile totals */}
        <div className="card p-3 bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <span>စုစုပေါင်းအိတ်ရေ:</span>
            <span className="text-right">{totalBags}</span>
            <span>စုစုပေါင်းအလေးချိန်:</span>
            <span className="text-right">{totalWeight.toFixed(2)} ပိဿာ</span>
            <span className="text-base">စုစုပေါင်းကျသင့်ငွေ:</span>
            <span className="text-right text-base">{grandTotal.toLocaleString()} ကျပ်</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <button onClick={addRow} className="btn-secondary text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ပစ္စည်းထည့်ရန်
        </button>

        {/* Desktop grand total */}
        <div className="hidden sm:block text-right">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            စုစုပေါင်းကျသင့်ငွေ:{' '}
          </span>
          <span className="text-xl font-bold text-primary-600">
            {grandTotal.toLocaleString()} ကျပ်
          </span>
        </div>
      </div>
    </div>
  )
}
