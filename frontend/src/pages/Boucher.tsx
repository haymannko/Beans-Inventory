import { useState } from 'react'
import { FiPrinter } from 'react-icons/fi'

interface VoucherRow {
  id: string
  no: number
  beanType: string
  bags: number
  weightViss: number
  pricePerViss: number
  totalAmount: number
}

function createRow(no: number): VoucherRow {
  return { id: crypto.randomUUID(), no, beanType: '', bags: 0, weightViss: 0, pricePerViss: 0, totalAmount: 0 }
}

/** Simple Myanmar number converter (for amount in words) */
function toMyanmarWords(n: number): string {
  const d = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉']
  const u = ['', 'ဆယ်', 'ရာ', 'ထောင်', 'သောင်း', 'သိန်း']
  const s = Math.round(n).toString()
  let r = ''
  for (let i = 0; i < s.length; i++) {
    const digit = parseInt(s[i])
    const place = s.length - 1 - i
    if (digit !== 0) {
      if (digit !== 1 || place === 0 || place === 4) r += d[digit]
      r += u[place]
    }
  }
  return r || 'သုည'
}

export default function Boucher() {
  const [voucherNo, setVoucherNo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [customer, setCustomer] = useState('')
  const [rows, setRows] = useState<VoucherRow[]>([createRow(1)])

  const updateRow = (id: string, field: keyof VoucherRow, val: string | number) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: val }
        if (field === 'weightViss' || field === 'pricePerViss') {
          const w = field === 'weightViss' ? Number(val) : r.weightViss
          const p = field === 'pricePerViss' ? Number(val) : r.pricePerViss
          updated.totalAmount = w * p
        }
        return updated
      })
    )
  }

  const addRow = () => setRows(prev => [...prev, createRow(prev.length + 1)])
  const removeRow = (id: string) => {
    if (rows.length <= 1) return
    setRows(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, no: i + 1 })))
  }

  const totalBags = rows.reduce((s, r) => s + r.bags, 0)
  const totalWeight = rows.reduce((s, r) => s + r.weightViss, 0)
  const grandTotal = rows.reduce((s, r) => s + r.totalAmount, 0)

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ဘောင်ချာ</h1>
          <p className="text-gray-500 dark:text-gray-400">Bouncher / Voucher</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
          <FiPrinter className="w-4 h-4" /> ပုံနှိပ်မည်
        </button>
      </div>

      {/* ===== VOUCHER PAPER ===== */}
      <div
        id="voucher"
        className="relative bg-[#faf6ee] text-gray-800 rounded-none shadow-lg print:shadow-none mx-auto"
        style={{ maxWidth: '800px' }}
      >
        {/* ===== ORNATE BORDER SVG ===== */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none print:block"
          viewBox="0 0 800 1100"
          preserveAspectRatio="none"
          style={{ display: 'none' }}
        >
          {/* Outer border line */}
          <rect x="8" y="8" width="784" height="1084" fill="none" stroke="#8B4513" strokeWidth="1.5" />
          {/* Inner border line */}
          <rect x="14" y="14" width="772" height="1068" fill="none" stroke="#8B4513" strokeWidth="0.8" />
          {/* Corner ornaments - top left */}
          <path d="M8,8 Q8,40 24,40 Q40,40 40,24 Q40,8 8,8Z" fill="none" stroke="#8B4513" strokeWidth="1.2" />
          <circle cx="24" cy="24" r="4" fill="none" stroke="#8B4513" strokeWidth="0.8" />
          {/* Corner ornaments - top right */}
          <path d="M792,8 Q792,40 776,40 Q760,40 760,24 Q760,8 792,8Z" fill="none" stroke="#8B4513" strokeWidth="1.2" />
          <circle cx="776" cy="24" r="4" fill="none" stroke="#8B4513" strokeWidth="0.8" />
          {/* Corner ornaments - bottom left */}
          <path d="M8,1092 Q8,1060 24,1060 Q40,1060 40,1076 Q40,1092 8,1092Z" fill="none" stroke="#8B4513" strokeWidth="1.2" />
          <circle cx="24" cy="1076" r="4" fill="none" stroke="#8B4513" strokeWidth="0.8" />
          {/* Corner ornaments - bottom right */}
          <path d="M792,1092 Q792,1060 776,1060 Q760,1060 760,1076 Q760,1092 792,1092Z" fill="none" stroke="#8B4513" strokeWidth="1.2" />
          <circle cx="776" cy="1076" r="4" fill="none" stroke="#8B4513" strokeWidth="0.8" />
          {/* Decorative top border pattern */}
          <path d="M60,8 Q100,24 140,8 Q180,24 220,8 Q260,24 300,8 Q340,24 380,8 Q420,24 460,8 Q500,24 540,8 Q580,24 620,8 Q660,24 700,8 Q740,24 740,8" fill="none" stroke="#8B4513" strokeWidth="0.8" />
          <path d="M60,1092 Q100,1076 140,1092 Q180,1076 220,1092 Q260,1076 300,1092 Q340,1076 380,1092 Q420,1076 460,1092 Q500,1076 540,1092 Q580,1076 620,1092 Q660,1076 700,1092 Q740,1076 740,1092" fill="none" stroke="#8B4513" strokeWidth="0.8" />
        </svg>

        {/* ===== PDF-style border using CSS ===== */}
        <div
          className="border-2 border-[#8B4513] m-2 print:m-3"
          style={{ borderStyle: 'double' }}
        >
          <div className="border border-[#8B4513] m-1 p-3 md:p-5">
            {/* ===== TITLE ===== */}
            <div className="text-center mb-3">
              <h2 className="text-lg md:text-xl font-bold text-[#8B4513]" style={{ fontFamily: 'serif' }}>
                ပဲအရောင်းအဝယ်ဘောင်ချာ
              </h2>
              <p className="text-[10px] italic text-[#8B4513]/70">Bean Trading Voucher</p>
            </div>

            {/* ===== HEADER ROW ===== */}
            <div className="flex flex-col sm:flex-row justify-between gap-2 mb-3 text-xs md:text-sm border-b border-[#8B4513]/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#8B4513]">ဘောင်ချာအမှတ် -</span>
                <input
                  type="text"
                  value={voucherNo}
                  onChange={e => setVoucherNo(e.target.value)}
                  className="bg-transparent border-b border-dashed border-[#8B4513]/50 py-0.5 w-28 focus:outline-none text-gray-800"
                  placeholder="........."
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#8B4513]">ရက်စွဲ -</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="bg-transparent border-b border-dashed border-[#8B4513]/50 py-0.5 w-36 focus:outline-none text-gray-800 text-xs"
                />
              </div>
            </div>

            {/* ===== CUSTOMER ===== */}
            <div className="mb-3 text-xs md:text-sm border-b border-[#8B4513]/30 pb-2">
              <span className="font-semibold text-[#8B4513]">အရောင်းအဝယ်ပြုလုပ်သူအမည် -</span>{' '}
              <input
                type="text"
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                className="bg-transparent border-b border-dashed border-[#8B4513]/50 py-0.5 min-w-[200px] focus:outline-none text-gray-800"
                placeholder="............................"
              />
            </div>

            {/* ===== TABLE ===== */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#8B4513]">
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-center w-8">No</th>
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-left">ပဲအမျိုးအစား</th>
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-right">အိတ်ရေ</th>
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-right">အလေးချိန် (ပိဿာ)</th>
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-right">တစ်ပိဿာနှုန်း</th>
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-right">ကျသင့်ငွေ</th>
                    <th className="py-1.5 px-1 font-bold text-[#8B4513] text-center w-8 print:hidden"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-[#8B4513]/20">
                      <td className="py-1.5 px-1 text-center font-medium text-gray-700">{row.no}</td>
                      <td className="py-1.5 px-1">
                        <input
                          type="text"
                          value={row.beanType}
                          onChange={e => updateRow(row.id, 'beanType', e.target.value)}
                          className="w-full bg-transparent border-b border-dashed border-[#8B4513]/30 py-0.5 focus:outline-none text-gray-800 min-w-[80px]"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          value={row.bags || ''}
                          onChange={e => updateRow(row.id, 'bags', Number(e.target.value))}
                          className="w-full bg-transparent border-b border-dashed border-[#8B4513]/30 py-0.5 focus:outline-none text-right text-gray-800"
                          min="0"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          value={row.weightViss || ''}
                          onChange={e => updateRow(row.id, 'weightViss', Number(e.target.value))}
                          className="w-full bg-transparent border-b border-dashed border-[#8B4513]/30 py-0.5 focus:outline-none text-right text-gray-800"
                          min="0" step="0.01"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          value={row.pricePerViss || ''}
                          onChange={e => updateRow(row.id, 'pricePerViss', Number(e.target.value))}
                          className="w-full bg-transparent border-b border-dashed border-[#8B4513]/30 py-0.5 focus:outline-none text-right text-gray-800"
                          min="0"
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-medium text-gray-800">
                        {row.totalAmount > 0 ? row.totalAmount.toLocaleString() : ''}
                      </td>
                      <td className="py-1.5 px-1 text-center print:hidden">
                        <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 text-xs" title="ဖျက်မည်">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-[#8B4513] font-bold text-gray-800">
                    <td colSpan={2} className="py-1.5 px-1 text-right text-[#8B4513]">စုစုပေါင်း</td>
                    <td className="py-1.5 px-1 text-right">{totalBags || ''}</td>
                    <td className="py-1.5 px-1 text-right">{totalWeight > 0 ? totalWeight.toFixed(2) : ''}</td>
                    <td className="py-1.5 px-1"></td>
                    <td className="py-1.5 px-1 text-right">{grandTotal > 0 ? grandTotal.toLocaleString() : ''}</td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ===== ADD ROW BUTTON ===== */}
            <div className="mt-2 print:hidden">
              <button onClick={addRow} className="text-xs text-[#8B4513] hover:text-[#a0522d] border border-dashed border-[#8B4513]/50 px-3 py-1 rounded">
                + ပစ္စည်းထည့်ရန်
              </button>
            </div>

            {/* ===== AMOUNT IN WORDS ===== */}
            {grandTotal > 0 && (
              <div className="mt-3 p-2 bg-[#8B4513]/5 border border-[#8B4513]/20 rounded text-xs md:text-sm">
                <span className="font-semibold text-[#8B4513]">ကျသင့်ငွေစာဖြင့်ရေး - </span>
                <span className="text-gray-700">{toMyanmarWords(grandTotal)} ကျပ်</span>
              </div>
            )}

            {/* ===== SIGNATURES ===== */}
            <div className="mt-6 pt-3 border-t border-[#8B4513]/40">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="border-b border-[#8B4513]/50 h-10 mb-1"></div>
                  <p className="font-semibold text-[#8B4513]">ရောင်းချသူ လက်မှတ်</p>
                  <p className="text-[10px] text-gray-500">Seller's Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-[#8B4513]/50 h-10 mb-1"></div>
                  <p className="font-semibold text-[#8B4513]">ဝယ်ယူသူ လက်မှတ်</p>
                  <p className="text-[10px] text-gray-500">Buyer's Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-[#8B4513]/50 h-10 mb-1"></div>
                  <p className="font-semibold text-[#8B4513]">သက်သေလက်မှတ်</p>
                  <p className="text-[10px] text-gray-500">Witness's Signature</p>
                </div>
              </div>
              <div className="mt-3 text-center text-[9px] text-gray-400">
                ဤဘောင်ချာသည် ပဲအရောင်းအဝယ်တွင် တရားဝင်အထောက်အထားဖြစ်ပါသည်။
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ===== PRINT STYLES ===== */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\\\:hidden { display: none !important; }
          #voucher { box-shadow: none !important; max-width: 100% !important; }
          #voucher input { border-color: #8B4513 !important; background: transparent !important; }
          #voucher svg { display: block !important; }
          @page { margin: 0.3in; }
        }
        input[type="number"]::-webkit-inner-spin-button { opacity: 0.3; }
        #voucher input:focus { border-bottom-width: 2px; border-color: #8B4513; }
      `}</style>
    </div>
  )
}
