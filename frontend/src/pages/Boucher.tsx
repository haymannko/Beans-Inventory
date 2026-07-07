import { useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import { useBeanTypes } from '../hooks/useBeanTypes'
import { useWeightMasterList } from '../hooks/useWeightMaster'

const RED = '#c0392b'
const BORDER_COLOR = RED

interface Row {
  no: string
  beanTypeId: string
  beanType: string
  bags: number
  weight: number
  rate: number
  amount: number
  weightMaster: number
}

const createRow = (): Row => ({
  no: '',
  beanTypeId: '',
  beanType: '',
  bags: 0,
  weight: 0,
  rate: 0,
  amount: 0,
  weightMaster: 0,
})

const TOTAL_ROWS = 12

export default function Boucher() {
  const [voucherNumber, setVoucherNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [rows, setRows] = useState<Row[]>(Array.from({ length: TOTAL_ROWS }, createRow))

  const { data: beanTypes } = useBeanTypes()
  const { data: weightMasterList } = useWeightMasterList()

  // Build a lookup map: bean_type_id -> weight
  const weightMap = new Map<string, number>()
  if (weightMasterList) {
    for (const wm of weightMasterList) {
      weightMap.set(wm.bean_type_id, wm.weight)
    }
  }

  const updateRow = (idx: number, field: keyof Row, value: number | string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r
        const updated = { ...r, [field]: value }

        // When bean type changes, auto-load weight from master
        if (field === 'beanTypeId') {
          const bt = beanTypes?.find((b) => b.id === value)
          updated.beanType = bt?.name || ''
          const masterWeight = weightMap.get(value as string) || 0
          updated.weightMaster = masterWeight
          // Recalculate amount
          updated.amount = updated.bags * updated.weight * updated.rate / (masterWeight || 1)
        }

        // Recalculate amount when bags, weight, or rate changes
        if (field === 'bags' || field === 'weight' || field === 'rate') {
          const b = field === 'bags' ? Number(value) : r.bags
          const w = field === 'weight' ? Number(value) : r.weight
          const p = field === 'rate' ? Number(value) : r.rate
          updated.amount = b * w * p / (updated.weightMaster || 1)
        }

        return updated
      })
    )
  }

  const totalAmount = rows.reduce((s, x) => s + x.amount, 0)

  const handlePrint = () => {
    document.body.classList.add('printing')
    window.print()
    setTimeout(() => {
      document.body.classList.remove('printing')
    }, 1000)
  }

  return (
    <div id="voucher-page" style={{ background: '#f0f0f0', minHeight: '100vh', padding: '16px' }}>
      {/* ---- Toolbar (hidden on print) ---- */}
      <div
        className="no-print"
        style={{
          maxWidth: 210 * 3.78,
          margin: '0 auto 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          ဘောင်ချာ
        </h1>
        <button
          onClick={handlePrint}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            color: '#374151',
          }}
        >
          <FiPrinter style={{ width: 14, height: 14 }} />
          ပုံနှိပ်မည်
        </button>
      </div>

      {/* ==================== VOUCHER ==================== */}
      <div id="voucher" style={voucherOuterStyle}>
        {/* Outer thick border */}
        <div style={outerBorderStyle}>
          {/* Inner thin border */}
          <div style={innerBorderStyle}>
            {/* Corner L-brackets */}
            <svg style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14 }} viewBox="0 0 14 14">
              <path d="M0,0 L7,0 L7,1 L1,1 L1,7 L0,7 Z" fill={BORDER_COLOR} />
            </svg>
            <svg style={{ position: 'absolute', top: -1, right: -1, width: 14, height: 14 }} viewBox="0 0 14 14">
              <path d="M14,0 L7,0 L7,1 L13,1 L13,7 L14,7 Z" fill={BORDER_COLOR} />
            </svg>
            <svg style={{ position: 'absolute', bottom: -1, left: -1, width: 14, height: 14 }} viewBox="0 0 14 14">
              <path d="M0,14 L7,14 L7,13 L1,13 L1,7 L0,7 Z" fill={BORDER_COLOR} />
            </svg>
            <svg style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14 }} viewBox="0 0 14 14">
              <path d="M14,14 L7,14 L7,13 L13,13 L13,7 L14,7 Z" fill={BORDER_COLOR} />
            </svg>

            {/* Content area */}
            <div style={{ padding: '10px 14px' }}>

              {/* ===== RED HEADER BANNER ===== */}
              <div
                style={{
                  position: "relative",
                  height: 55,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: 34,
                    fontWeight: "bold",
                    color: BORDER_COLOR,
                    fontFamily: '"Pyidaungsu","Noto Sans Myanmar"',
                  }}
                >
                  အောင်ပွင့် - ပွဲရုံ
                </h1>
                <input
                  type="text"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="0854"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 70,
                    border: "none",
                    background: "transparent",
                    textAlign: "right",
                    fontSize: 18,
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
              </div>

              {/* ===== RED HEADER BANNER ===== */}
              <div style={headerBannerStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {/* ===== BUSINESS TYPE (red) ===== */}
                  <div style={{ textAlign: 'center', marginBottom: 2 }}>
                    <p
                      style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: RED,
                        margin: 0,
                      }}
                    >
                      ပဲမျိုးစုံ ပြောင်း ဂျုံ ဆီထွက်သီနှံရောင်းဝယ်ရေး
                    </p>
                  </div>
                </div>
              </div>


              {/* ===== ADDRESS ===== */}
              <div style={{ textAlign: 'center', marginBottom: 2 }}>
                <p style={{ fontSize: 10, color: '#555', margin: 0 }}>
                  လမ်း၃၀ ၈၉*၉၀ လမ်းကြား ကျောက်ဆစ်မီးသတ်အရှေ့ဘက် ဥယျာဉ်တန်းရပ် မန္တလေးမြို
                </p>
              </div>

              {/* ===== PHONE NUMBERS ===== */}
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: '#555', margin: 0 }}>
                  ☎ 09-********, 09-********, 09-********
                </p>
              </div>

              {/* ===== LOCATION & DATE ===== */}
              <div style={locationDateBarStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: RED, fontSize: 12 }}>အမည်</span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={inlineInputStyle}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: RED, fontSize: 12 }}>ရက်စွဲ</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ ...inlineInputStyle, width: 120 }}
                  />
                </div>
              </div>

              {/* ===== DATA TABLE ===== */}
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 23 }}>စဉ်</th>
                    <th style={{ ...thStyle, width: 200 }}>ကုန်အမျိုးအမည်</th>
                    <th style={{ ...thStyle, width: 80 }}>ထည့်ဝင်သည့်အလေးချိန်</th>
                    <th style={{ ...thStyle, width: 48 }}>အိတ်</th>
                    <th style={{ ...thStyle, width: 64 }}>ပိဿာ</th>
                    <th style={{ ...thStyle, width: 100 }}>ဈေးနှုန်း</th>
                    <th style={{ ...thStyle, width: 200 }}>သင့်ငွေ(ကျပ်)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: TOTAL_ROWS }).map((_, i) => {
                    const row = rows[i]
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <input
                            type="text"
                            value={row?.no ?? ''}
                            onChange={(e) => updateRow(i, 'no', e.target.value)}
                            style={{ ...cellInputStyle, textAlign: 'center' }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={row?.beanTypeId ?? ''}
                            onChange={(e) => updateRow(i, 'beanTypeId', e.target.value)}
                            style={cellSelectStyle}
                          >
                            <option value="">ရွေးပါ</option>
                            {beanTypes?.map((bt) => (
                              <option key={bt.id} value={bt.id}>{bt.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={row?.weight || ''}
                            onChange={(e) => updateRow(i, 'weight', Number(e.target.value))}
                            style={{ ...cellInputStyle, textAlign: 'center' }}
                            min="0"
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            value={row?.bags || ''}
                            onChange={(e) => updateRow(i, 'bags', Number(e.target.value))}
                            style={{ ...cellInputStyle, textAlign: 'right' }}
                            min="0"
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11, color: '#888' }}>
                          {row?.weightMaster || ''}
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            value={row?.rate || ''}
                            onChange={(e) => updateRow(i, 'rate', Number(e.target.value))}
                            style={{ ...cellInputStyle, textAlign: 'right' }}
                            min="0"
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500, color: '#1a1a1a' }}>
                          {row && row.amount > 0 ? row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: RED, borderBottom: 'none', borderTop: `2px solid ${BORDER_COLOR}` }}
                    >
                      စုစုပေါင်း
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: RED,
                        borderBottom: 'none',
                        borderTop: `2px solid ${BORDER_COLOR}`,
                      }}
                    >
                      {totalAmount > 0 ? totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}
                    </td>
                    <td style={{ ...tdStyle, borderBottom: 'none', borderTop: `2px solid ${BORDER_COLOR}` }} />
                  </tr>
                </tfoot>
              </table>

              {/* ===== FOOTER FIELDS ===== */}
              <div style={{ marginTop: 14, paddingTop: 6, fontSize: 12 }}>
                {/* Row 1: ကားခ + လက်ခံရရှိ */}
                <div style={footerRowStyle}>
                  <FieldLine label="ကားခ" />
                  <FieldLine label="လက်ခံရရှိ" />
                </div>
                {/* Row 2: ချိန်ခ + မှတ်ချက် */}
                <div style={footerRowStyle}>
                  <FieldLine label="ချိန်ခ" />
                  <FieldLine label="မှတ်ချက်" />
                </div>
                {/* Row 3: ချခ + ထောက်ခံ */}
                <div style={footerRowStyle}>
                  <FieldLine label="ချခ" />
                  <FieldLine label="ထောက်ခံ" />
                </div>
                {/* Row 4: ကော်မရှင်ခ + လက်မှတ် */}
                <div style={footerRowStyle}>
                  <FieldLine label="ကော်မရှင်ခ" />
                  <FieldLine label="လက်မှတ်" />
                </div>
                {/* Row 5: အသုံး (left only) */}
                <div style={footerRowStyle}>
                  <FieldLine label="အသုံး" />
                  <div style={{ flex: 1 }} />
                </div>
                {/* Row 6: ခုနှိမ်ငွေ (left only) */}
                <div style={footerRowStyle}>
                  <FieldLine label="ခုနှိမ်ငွေ" />
                  <div style={{ flex: 1 }} />
                </div>
                {/* Totals row: စုစုပေါင်း ခုနှိမ်ငွေ (full width) */}
                <div style={footerRowStyle}>
                  <FieldLine label="စုစုပေါင်း ခုနှိမ်ငွေ" />
                  <div style={{ flex: 1 }} />
                </div>
                {/* Remaining: ကျန်ငွေ (full width) */}
                <div style={{ display: 'flex', gap: 24 }}>
                  <FieldLine label="ကျန်ငွေ" />
                  <div style={{ flex: 1 }} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ===== PRINT STYLES ===== */}
      <style>{printCSS}</style>
    </div>
  )
}

/* ==================== INLINE COMPONENTS ==================== */

function FieldLine({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1 }}>
      <span
        style={{
          fontWeight: 600,
          whiteSpace: 'nowrap',
          fontSize: 12,
          color: RED,
        }}
      >
        {label} -
      </span>
      <span
        style={{
          flex: 1,
          borderBottom: '1px solid #b0a090',
          minWidth: 40,
        }}
      >
        &nbsp;
      </span>
    </div>
  )
}

/* ==================== STYLE OBJECTS ==================== */

const voucherOuterStyle: React.CSSProperties = {
  maxWidth: 210 * 3.78, // A4 width in px at 96dpi
  margin: '0 auto',
  background: '#fdf0ec',
  fontFamily: '"Noto Sans Myanmar", "Pyidaungsu", "Myanmar Text", "Tharlon", serif',
}

const outerBorderStyle: React.CSSProperties = {
  position: 'relative',
  border: `3px solid ${BORDER_COLOR}`,
  margin: 0,
}

const innerBorderStyle: React.CSSProperties = {
  position: 'relative',
  border: `1px solid ${BORDER_COLOR}`,
  margin: 4,
}

const headerBannerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 4,
}

const locationDateBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 4px',
  marginBottom: 8,
  borderBottom: `1px solid ${BORDER_COLOR}`,
  fontSize: 12,
}

const inlineInputStyle: React.CSSProperties = {
  background: 'transparent',
  outline: 'none',
  fontSize: 12,
  color: '#374151',
  width: 160,
  borderBottom: '1px solid #999',
  border: 'none',
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: '#999',
  padding: '1px 0',
  fontFamily: 'inherit',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  fontSize: 12,
  border: `1px solid ${BORDER_COLOR}`,
}

const thStyle: React.CSSProperties = {
  padding: '5px 6px',
  fontWeight: 700,
  textAlign: 'center',
  color: '#fff',
  background: RED,
  border: `1px solid ${BORDER_COLOR}`,
  fontSize: 11,
}

const tdStyle: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: `1px solid ${BORDER_COLOR}`,
  border: `1px solid ${BORDER_COLOR}`,
  fontSize: 12,
  lineHeight: 1.4,
  verticalAlign: 'middle',
}

const cellInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  outline: 'none',
  border: 'none',
  fontSize: 12,
  color: '#374151',
  padding: 0,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const cellSelectStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  outline: 'none',
  border: 'none',
  fontSize: 12,
  color: '#374151',
  padding: 0,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  cursor: 'pointer',
}

const footerRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  marginBottom: 4,
}

/* ==================== PRINT CSS ==================== */

const printCSS = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }
    html, body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print {
      display: none !important;
    }
    #voucher-page {
      padding: 0 !important;
      background: white !important;
      min-height: auto !important;
    }
    #voucher {
      box-shadow: none !important;
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
      background: #fdf0ec !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #voucher > div {
      border: 3px solid ${RED} !important;
      margin: 6px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #voucher > div > div {
      border: 1px solid ${RED} !important;
      margin: 4px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #voucher svg {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #voucher input, #voucher select {
      border-color: transparent !important;
      background: transparent !important;
      color: #000 !important;
    }
    table, th, td {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    th {
      background: ${RED} !important;
      color: white !important;
    }
  }
  #voucher input:focus, #voucher select:focus {
    outline: none;
    border-bottom-color: ${RED} !important;
  }
  input[type="number"]::-webkit-inner-spin-button {
    opacity: 0.3;
  }
`
