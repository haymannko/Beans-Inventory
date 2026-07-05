interface VoucherHeaderProps {
  voucherNumber: string
  date: string
  onVoucherNumberChange: (val: string) => void
  onDateChange: (val: string) => void
}

export default function VoucherHeader({
  voucherNumber,
  date,
  onVoucherNumberChange,
  onDateChange,
}: VoucherHeaderProps) {
  return (
    <div className="text-center mb-6 print:mb-4">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
        ဘောင်ချာ
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Voucher</p>

      <div className="flex flex-col sm:flex-row justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            ဘောင်ချာအမှတ်:
          </label>
          <input
            type="text"
            value={voucherNumber}
            onChange={(e) => onVoucherNumberChange(e.target.value)}
            className="input-field py-1.5 w-36 text-center"
            placeholder="001"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            ရက်စွဲ:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="input-field py-1.5 w-40"
          />
        </div>
      </div>
    </div>
  )
}
