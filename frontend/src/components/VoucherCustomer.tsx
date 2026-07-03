interface VoucherCustomerProps {
  customerName: string
  onCustomerNameChange: (val: string) => void
}

export default function VoucherCustomer({ customerName, onCustomerNameChange }: VoucherCustomerProps) {
  return (
    <div className="mb-4 print:mb-3">
      <div className="flex items-center gap-2">
        <label className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
          အရောင်းအဝယ်ပြုလုပ်သူအမည်:
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          className="input-field py-1.5 flex-1"
          placeholder="ဦးဘခင် / U Ba Khin"
        />
      </div>
    </div>
  )
}
