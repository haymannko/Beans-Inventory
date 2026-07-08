import { useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import { useWeightMasterList } from '../hooks/useWeightMaster'

const RED = '#c0392b'
const BORDER_COLOR = RED

interface Row {
  no: string
  beanType: string
  bags: number
  weight: number
  rate: number
  amount: number
}

const createRow = (): Row => ({
  no: '',
  beanType: '',
  bags: 0,
  weight: 0,
  rate: 0,
  amount: 0,
})

const TOTAL_ROWS = 12

// Hardcoded default weights per bean type (အသားအလေးချိန်)
const DEFAULT_WEIGHTS: Record<string, number> = {
  'ဂျုံ': 60,
  'ကုလားပဲအဝါ': 56.25,
  'နှမ်း': 45,
  'ပြောင်းဖူးစေ့': 54,
  'ခွန်ပြောင်းအနက်': 53,
  'အထွက်တိုးပြောင်း': 53,
  'သိပ္ပံပြောင်း': 53,
  'ဆန်ပြောင်း': 59.25,
  'ကုလားပဲဖြူ ကြီး': 57.25,
  'ကုလားပဲဖြူ သေး': 57.25,
  'ပဲဒီစိမ်း': 56.25,
  'စွန်တာပြာ': 58.25,
  'မတ်ပဲ': 60,
  'ပဲစင်းငုံ': 60,
  'နံနံ': 24,
  'ပဲလိပ်ပြာ / ပဲကြား': 56.25,
  'ပဲနီပြား': 55.25,
  'မြေထောက်ပဲ': 54,
  'တရုတ်ပဲကြီး': 50,
  'နိုင်လွန်ပဲ': 59.25,
  'စားတော်ပဲ': 59.25,
  'ပဲလွန်းဖြူ': 60,
  'ပဲလွန်းပြာ': 54.25,
  'ပဲလွန်းဝါ': 54.25,
  'ထောပတ်ဖြူ ကြီး/သေး': 56.25,
  'ပဲကြီး': 55.25,
  'ပဲကြီးမျိုးစုံ / ရွှေယင်းမာ': 55.25,
  'ပဲပုတ်စေ့': 53.25,
  'ပဲရာဇာ': 61.25,
  'ပဲယဉ်း': 60,
  'ခေတ်သစ် (ခ) ပဲဖြူလေး': 57.25,
  'ဆီနေကြာ': 27,
  'ပန်းနှမ်း': 45,
  'မိုးလေးနှမ်း': 49.25,
  'ကြက်ဆူအကြား (နီကြား/ဖြူကြား)': 36,
  'ကြက်ဆူအနက်': 30,
  'ကဇင်းသီး': 37.25,
  'ကြို့စေ့': 38.25,
}

export default function Boucher() {
  const [voucherNumber, setVoucherNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [rows, setRows] = useState<Row[]>(Array.from({ length: TOTAL_ROWS }, createRow))

  const { data: weightMasterList } = useWeightMasterList()

  // Weight lookup: DB first → DEFAULT_WEIGHTS exact → DEFAULT_WEIGHTS fuzzy → 0
  const lookupWeight = (beanType: string): number => {
    if (!beanType) return 0
    const key = beanType.trim()

    // 1. DB exact match
    const dbExact = weightMasterList?.find((w) => w.bean_name.trim() === key)
    if (dbExact) return Number(dbExact.weight)

    // 2. DEFAULT_WEIGHTS exact match
    if (key in DEFAULT_WEIGHTS) return DEFAULT_WEIGHTS[key]

    // 3. DB fuzzy match
    const dbFuzzy = weightMasterList?.find(
      (w) => w.bean_name.includes(key) || key.includes(w.bean_name)
    )
    if (dbFuzzy) return Number(dbFuzzy.weight)

    // 4. DEFAULT_WEIGHTS fuzzy match
    for (const [name, weight] of Object.entries(DEFAULT_WEIGHTS)) {
      if (name.includes(key) || key.includes(name)) return weight
    }

    return 0
  }

  const updateRow = (
    idx: number,
    field: keyof Row,
    value: number | string
  ) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r
        const updated = { ...r, [field]: value }

        // Formula: ထည့်ဝင်သည့်အလေးချိန် × အိတ် × ဈေးနှုန်း / အသားအလေးချိန် = သင့်ငွေ
        const masterWeight = lookupWeight(updated.beanType)
        if (masterWeight > 0) {
          updated.amount =
            (updated.weight * updated.bags * updated.rate) / masterWeight
        } else {
          updated.amount = 0
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

              {/* ===== BUSINESS TYPE ===== */}
              <div style={headerBannerStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
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
                          <input
                            type="text"
                            list={`bean-list-${i}`}
                            value={row?.beanType ?? ''}
                            onChange={(e) => updateRow(i, 'beanType', e.target.value)}
                            style={cellInputStyle}
                            placeholder="ပဲအမျိုးအစား"
                          />
                          <datalist id={`bean-list-${i}`}>
                            {Object.keys(DEFAULT_WEIGHTS).map((name) => (
                              <option key={name} value={name} />
                            ))}
                            {weightMasterList?.map((wm) => (
                              <option key={wm.id} value={wm.bean_name} />
                            ))}
                          </datalist>
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
                      colSpan={4}
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
                <div style={footerRowStyle}>
                  <FieldLine label="ကားခ" />
                  <FieldLine label="လက်ခံရရှိ" />
                </div>
                <div style={footerRowStyle}>
                  <FieldLine label="ချိန်ခ" />
                  <FieldLine label="မှတ်ချက်" />
                </div>
                <div style={footerRowStyle}>
                  <FieldLine label="ချခ" />
                  <FieldLine label="ထောက်ခံ" />
                </div>
                <div style={footerRowStyle}>
                  <FieldLine label="ကော်မရှင်ခ" />
                  <FieldLine label="လက်မှတ်" />
                </div>
                <div style={footerRowStyle}>
                  <FieldLine label="အသုံး" />
                  <div style={{ flex: 1 }} />
                </div>
                <div style={footerRowStyle}>
                  <FieldLine label="ခုနှိမ်ငွေ" />
                  <div style={{ flex: 1 }} />
                </div>
                <div style={footerRowStyle}>
                  <FieldLine label="စုစုပေါင်း ခုနှိမ်ငွေ" />
                  <div style={{ flex: 1 }} />
                </div>
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
  maxWidth: 210 * 3.78,
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
// rebuild
