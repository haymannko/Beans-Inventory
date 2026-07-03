import { useState } from 'react'
import { FiPrinter } from 'react-icons/fi'

interface Row {
  id: string
  no: number
  beanType: string
  bags: number
  weight: number
  rate: number
  amount: number
}

const r = (n: number): Row => ({ id: crypto.randomUUID(), no: n, beanType: '', bags: 0, weight: 0, rate: 0, amount: 0 })

function myanNum(n: number): string {
  if (!n) return ''
  const d = '၀၁၂၃၄၅၆၇၈၉', u = ['', 'ဆယ်', 'ရာ', 'ထောင်', 'သောင်း', 'သိန်း', 'ကုဋေ']
  let s = Math.round(n).toString(), r = ''
  for (let i = 0; i < s.length; i++) {
    const p = s.length - 1 - i, v = parseInt(s[i])
    if (v) { if (v !== 1 || p === 0 || p === 4) r += d[v]; r += u[p] }
  }
  return r
}

export default function Boucher() {
  const [vn, setVn] = useState('')
  const [dt, setDt] = useState(new Date().toISOString().split('T')[0])
  const [nm, setNm] = useState('')
  const [rows, setRows] = useState<Row[]>([r(1)])
  const up = (id: string, f: keyof Row, v: number | string) => setRows(prev => prev.map(x => {
    if (x.id !== id) return x
    const n = { ...x, [f]: v }
    if (f === 'weight' || f === 'rate') {
      const w = f === 'weight' ? Number(v) : x.weight, p = f === 'rate' ? Number(v) : x.rate
      n.amount = w * p
    }
    return n
  }))
  const tb = rows.reduce((s, x) => s + x.bags, 0)
  const tw = rows.reduce((s, x) => s + x.weight, 0)
  const ta = rows.reduce((s, x) => s + x.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">ဘောင်ချာ</h1>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm"><FiPrinter className="w-4 h-4" /> ပုံနှိပ်မည်</button>
      </div>

      {/* ==================== VOUCHER ==================== */}
      <div id="v" style={{ maxWidth: 820, margin: '0 auto', background: '#fffdf7', fontFamily: '"Noto Sans Myanmar", "Pyidaungsu", serif' }}>

        {/* --- main bordered box --- */}
        <div style={{ border: '2.5px solid #6b3a1f', margin: 6, position: 'relative' }}>
          {/* inner border */}
          <div style={{ border: '1px solid #6b3a1f', margin: 4, position: 'relative' }}>

            {/* ===== TOP ORNAMENT ===== */}
            <div style={{ textAlign: 'center', paddingTop: 14, position: 'relative' }}>
              <svg width="280" height="36" viewBox="0 0 280 36" style={{ display: 'block', margin: '0 auto' }}>
                {/* left scroll */}
                <path d="M10,18 Q30,4 50,18 Q70,32 90,18" fill="none" stroke="#6b3a1f" strokeWidth="1.2" />
                <path d="M20,18 Q35,8 50,18 Q65,28 80,18" fill="none" stroke="#6b3a1f" strokeWidth="0.7" />
                {/* center diamond */}
                <polygon points="140,6 148,18 140,30 132,18" fill="none" stroke="#6b3a1f" strokeWidth="1" />
                <line x1="140" y1="18" x2="140" y2="30" stroke="#6b3a1f" strokeWidth="0.5" />
                {/* right scroll */}
                <path d="M190,18 Q210,4 230,18 Q250,32 270,18" fill="none" stroke="#6b3a1f" strokeWidth="1.2" />
                <path d="M200,18 Q215,8 230,18 Q245,28 260,18" fill="none" stroke="#6b3a1f" strokeWidth="0.7" />
                {/* dots */}
                <circle cx="50" cy="18" r="1.5" fill="#6b3a1f" />
                <circle cx="90" cy="18" r="1.5" fill="#6b3a1f" />
                <circle cx="190" cy="18" r="1.5" fill="#6b3a1f" />
                <circle cx="230" cy="18" r="1.5" fill="#6b3a1f" />
              </svg>
            </div>

            {/* ===== TITLE ===== */}
            <div style={{ textAlign: 'center', margin: '4px 0 2px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#6b3a1f', letterSpacing: 2, margin: 0 }}>
                ပဲအရောင်းအဝယ်ဘောင်ချာ
              </h2>
              <div style={{ marginTop: 2 }}>
                <svg width="200" height="10" viewBox="0 0 200 10" style={{ display: 'block', margin: '0 auto' }}>
                  <path d="M30,5 Q50,1 70,5 Q90,9 110,5 Q130,1 150,5 Q170,9 190,5" fill="none" stroke="#6b3a1f" strokeWidth="0.8" />
                  <line x1="30" y1="5" x2="190" y2="5" stroke="#6b3a1f" strokeWidth="0.8" />
                  <circle cx="30" cy="5" r="1.2" fill="#6b3a1f" />
                  <circle cx="190" cy="5" r="1.2" fill="#6b3a1f" />
                </svg>
              </div>
              <div style={{ fontSize: 10, color: '#8b6914', fontStyle: 'italic', letterSpacing: 1 }}>BEAN TRADING VOUCHER</div>
            </div>

            {/* ===== HEADER FIELDS ===== */}
            <div style={{ padding: '8px 18px 0', fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: '1px dashed #6b3a1f', paddingBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: '#6b3a1f' }}>ဘောင်ချာအမှတ် -</span>
                  <input value={vn} onChange={e => setVn(e.target.value)} style={{ border: 'none', borderBottom: '1px dashed #6b3a1f', background: 'transparent', width: 140, padding: '2px 4px', outline: 'none', fontSize: 14, color: '#333' }} placeholder="................" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: '#6b3a1f' }}>ရက်စွဲ -</span>
                  <input type="date" value={dt} onChange={e => setDt(e.target.value)} style={{ border: 'none', borderBottom: '1px dashed #6b3a1f', background: 'transparent', width: 140, padding: '2px 4px', outline: 'none', fontSize: 13, color: '#333' }} />
                </div>
              </div>

              {/* ===== CUSTOMER ===== */}
              <div style={{ borderBottom: '1px dashed #6b3a1f', padding: '6px 0' }}>
                <span style={{ fontWeight: 600, color: '#6b3a1f' }}>အရောင်းအဝယ်ပြုလုပ်သူအမည် -</span>
                <input value={nm} onChange={e => setNm(e.target.value)} style={{ border: 'none', borderBottom: '1px dashed #6b3a1f', background: 'transparent', minWidth: 250, padding: '2px 4px', outline: 'none', fontSize: 14, color: '#333' }} placeholder=".................................................." />
              </div>
            </div>

            {/* ===== TABLE ===== */}
            <div style={{ padding: '4px 14px 2px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #6b3a1f' }}>
                    <th style={{ padding: '4px 3px', fontWeight: 700, color: '#6b3a1f', textAlign: 'center', width: 32 }}>No</th>
                    <th style={{ padding: '4px 3px', fontWeight: 700, color: '#6b3a1f', textAlign: 'center' }}>ပဲအမျိုးအစား</th>
                    <th style={{ padding: '4px 3px', fontWeight: 700, color: '#6b3a1f', textAlign: 'center', width: 60 }}>အိတ်ရေ</th>
                    <th style={{ padding: '4px 3px', fontWeight: 700, color: '#6b3a1f', textAlign: 'center', width: 80 }}>အလေးချိန် (ပိဿာ)</th>
                    <th style={{ padding: '4px 3px', fontWeight: 700, color: '#6b3a1f', textAlign: 'center', width: 80 }}>တစ်ပိဿာနှုန်း</th>
                    <th style={{ padding: '4px 3px', fontWeight: 700, color: '#6b3a1f', textAlign: 'center', width: 90 }}>ကျသင့်ငွေ</th>
                    <th className="print:hidden" style={{ padding: '4px 3px', width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #d4c5a9' }}>
                      <td style={{ padding: '3px', textAlign: 'center', color: '#6b3a1f' }}>{row.no}</td>
                      <td style={{ padding: '2px 3px' }}>
                        <input value={row.beanType} onChange={e => up(row.id, 'beanType', e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dashed #d4c5a9', background: 'transparent', padding: '2px', outline: 'none', fontSize: 13, color: '#333' }} />
                      </td>
                      <td style={{ padding: '2px 3px' }}>
                        <input type="number" value={row.bags || ''} onChange={e => up(row.id, 'bags', Number(e.target.value))} style={{ width: '100%', border: 'none', borderBottom: '1px dashed #d4c5a9', background: 'transparent', padding: '2px', outline: 'none', fontSize: 13, textAlign: 'right', color: '#333' }} min="0" />
                      </td>
                      <td style={{ padding: '2px 3px' }}>
                        <input type="number" value={row.weight || ''} onChange={e => up(row.id, 'weight', Number(e.target.value))} style={{ width: '100%', border: 'none', borderBottom: '1px dashed #d4c5a9', background: 'transparent', padding: '2px', outline: 'none', fontSize: 13, textAlign: 'right', color: '#333' }} min="0" step="0.01" />
                      </td>
                      <td style={{ padding: '2px 3px' }}>
                        <input type="number" value={row.rate || ''} onChange={e => up(row.id, 'rate', Number(e.target.value))} style={{ width: '100%', border: 'none', borderBottom: '1px dashed #d4c5a9', background: 'transparent', padding: '2px', outline: 'none', fontSize: 13, textAlign: 'right', color: '#333' }} min="0" />
                      </td>
                      <td style={{ padding: '3px', textAlign: 'right', fontWeight: 500, color: '#333' }}>{row.amount > 0 ? row.amount.toLocaleString() : ''}</td>
                      <td className="print:hidden" style={{ padding: '2px', textAlign: 'center' }}>
                        <button onClick={() => { if (rows.length > 1) setRows(prev => prev.filter(x => x.id !== row.id).map((x, i) => ({ ...x, no: i + 1 }))) }} style={{ color: '#c0392b', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #6b3a1f', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '4px 3px', textAlign: 'right', color: '#6b3a1f', fontSize: 14 }}>စုစုပေါင်း</td>
                    <td style={{ padding: '4px 3px', textAlign: 'right', color: '#333' }}>{tb || ''}</td>
                    <td style={{ padding: '4px 3px', textAlign: 'right', color: '#333' }}>{tw > 0 ? tw.toFixed(2) : ''}</td>
                    <td style={{ padding: '4px 3px' }}></td>
                    <td style={{ padding: '4px 3px', textAlign: 'right', color: '#6b3a1f', fontSize: 14 }}>{ta > 0 ? ta.toLocaleString() : ''}</td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ===== ADD ROW ===== */}
            <div className="print:hidden" style={{ padding: '4px 18px' }}>
              <button onClick={() => setRows(prev => [...prev, r(prev.length + 1)])} style={{ fontSize: 12, color: '#6b3a1f', border: '1px dashed #6b3a1f', background: 'transparent', padding: '3px 12px', cursor: 'pointer', borderRadius: 0 }}>+ ပစ္စည်းထည့်ရန်</button>
            </div>

            {/* ===== AMOUNT IN WORDS ===== */}
            {ta > 0 && (
              <div style={{ margin: '6px 18px', padding: '6px 10px', border: '1px solid #6b3a1f', background: '#f5efe0', fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: '#6b3a1f' }}>ကျသင့်ငွေစာဖြင့်ရေး - </span>
                <span style={{ color: '#333' }}>{myanNum(ta)} ကျပ်</span>
              </div>
            )}

            {/* ===== SIGNATURES ===== */}
            <div style={{ margin: '20px 18px 4px', borderTop: '1px solid #6b3a1f', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8 }}>
                {[['ရောင်းချသူ လက်မှတ်', "Seller's Signature"], ['ဝယ်ယူသူ လက်မှတ်', "Buyer's Signature"], ['သက်သေလက်မှတ်', "Witness's Signature"]].map(([mm, en]) => (
                  <div key={mm} style={{ textAlign: 'center', minWidth: 140 }}>
                    <div style={{ borderBottom: '1px solid #6b3a1f', height: 36, marginBottom: 3 }}></div>
                    <div style={{ fontWeight: 600, color: '#6b3a1f', fontSize: 13 }}>{mm}</div>
                    <div style={{ fontSize: 9, color: '#8b6914', fontStyle: 'italic' }}>{en}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 9, color: '#a09080' }}>
                ဤဘောင်ချာသည် ပဲအရောင်းအဝယ်တွင် တရားဝင်အထောက်အထားဖြစ်ပါသည်။
              </div>
            </div>

            {/* ===== BOTTOM ORNAMENT ===== */}
            <div style={{ textAlign: 'center', padding: '4px 0 10px' }}>
              <svg width="200" height="16" viewBox="0 0 200 16" style={{ display: 'block', margin: '0 auto' }}>
                <path d="M40,8 Q60,2 80,8 Q100,14 120,8 Q140,2 160,8" fill="none" stroke="#6b3a1f" strokeWidth="0.8" />
                <circle cx="40" cy="8" r="1.5" fill="#6b3a1f" />
                <circle cx="160" cy="8" r="1.5" fill="#6b3a1f" />
                <polygon points="100,4 105,8 100,12 95,8" fill="none" stroke="#6b3a1f" strokeWidth="0.8" />
              </svg>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\\\:hidden { display: none !important; }
          #v { box-shadow: none !important; max-width: 100% !important; }
          #v input { border-color: #6b3a1f !important; background: transparent !important; }
          @page { margin: 0.4in; }
        }
        input[type="number"]::-webkit-inner-spin-button { opacity: 0.3; }
        #v input:focus { border-bottom-width: 2px; border-color: #6b3a1f; }
      `}</style>
    </div>
  )
}
