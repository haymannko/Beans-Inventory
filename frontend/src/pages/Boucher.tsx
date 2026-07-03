import { useState } from 'react'
import VoucherHeader from '../components/VoucherHeader'
import VoucherCustomer from '../components/VoucherCustomer'
import VoucherTable, { type VoucherRow } from '../components/VoucherTable'
import VoucherSignature from '../components/VoucherSignature'
import { FiPrinter } from 'react-icons/fi'

export default function Boucher() {
  const [voucherNumber, setVoucherNumber] = useState('001')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [customerName, setCustomerName] = useState('')
  const [rows, setRows] = useState<VoucherRow[]>([
    {
      id: crypto.randomUUID(),
      no: 1,
      beanType: '',
      bags: 0,
      weightViss: 0,
      pricePerViss: 0,
      totalAmount: 0,
    },
  ])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ဘောင်ချာ</h1>
          <p className="text-gray-500 dark:text-gray-400">Bouncher / Voucher</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <FiPrinter className="w-4 h-4" />
            ပုံနှိပ်မည်
          </button>
        </div>
      </div>

      {/* Voucher Paper */}
      <div
        id="voucher-print-area"
        className="card p-4 md:p-6 lg:p-8 print:shadow-none print:border-0 print:p-4"
        style={
          { '@media print': { backgroundColor: 'white', color: 'black' } } as React.CSSProperties
        }
      >
        {/* Company / Shop Header */}
        <div className="text-center mb-4 print:mb-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            ပဲအရောင်းအဝယ်ဘောင်ချာ
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Bean Trading Voucher</p>
        </div>

        <VoucherHeader
          voucherNumber={voucherNumber}
          date={date}
          onVoucherNumberChange={setVoucherNumber}
          onDateChange={setDate}
        />

        <VoucherCustomer
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
        />

        <VoucherTable rows={rows} onRowsChange={setRows} />

        {/* Amount in words */}
        {rows.reduce((s, r) => s + r.totalAmount, 0) > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              ကျသင့်ငွေစာဖြင့်ရေး:{' '}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {numberToMyanmarWords(rows.reduce((s, r) => s + r.totalAmount, 0))} ကျပ်
            </span>
          </div>
        )}

        <VoucherSignature />
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white; }
          #voucher-print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0.5in !important;
            max-width: 100% !important;
          }
          .print\\:hidden { display: none !important; }
          input { border: none !important; background: transparent !important; }
        }
      `}</style>
    </div>
  )
}

/** Simple Myanmar number to words converter */
function numberToMyanmarWords(num: number): string {
  const digits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉']
  const units = ['', 'ဆယ်', 'ရာ', 'ထောင်', 'သောင်း', 'သိန်း', 'ကုဋေ']
  const numStr = Math.round(num).toString()
  let result = ''
  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i])
    const place = numStr.length - 1 - i
    if (digit !== 0) {
      if (digit !== 1 || place === 0) {
        result += digits[digit]
      }
      result += units[place]
    }
  }
  return result || 'သုည'
}
