export default function VoucherSignature() {
  return (
    <div className="mt-8 print:mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
        <div className="text-center">
          <div className="h-16 flex items-end justify-center">
            <span className="border-b border-gray-400 dark:border-gray-500 px-6 pb-1 inline-block min-w-[120px]">
              &nbsp;
            </span>
          </div>
          <p className="mt-1 font-medium text-gray-700 dark:text-gray-300">ရောင်းချသူလက်မှတ်</p>
          <p className="text-xs text-gray-500">Seller's Signature</p>
        </div>

        <div className="text-center">
          <div className="h-16 flex items-end justify-center">
            <span className="border-b border-gray-400 dark:border-gray-500 px-6 pb-1 inline-block min-w-[120px]">
              &nbsp;
            </span>
          </div>
          <p className="mt-1 font-medium text-gray-700 dark:text-gray-300">ဝယ်ယူသူလက်မှတ်</p>
          <p className="text-xs text-gray-500">Buyer's Signature</p>
        </div>

        <div className="text-center col-span-2 sm:col-span-1">
          <div className="h-16 flex items-end justify-center">
            <span className="border-b border-gray-400 dark:border-gray-500 px-6 pb-1 inline-block min-w-[120px]">
              &nbsp;
            </span>
          </div>
          <p className="mt-1 font-medium text-gray-700 dark:text-gray-300">တရားခံလက်မှတ်</p>
          <p className="text-xs text-gray-500">Witness's Signature</p>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500 print:mt-2">
        <p>ဤဘောင်ချာသည် ပဲအရောင်းအဝယ်တွင် တရားဝင်အထောက်အထားဖြစ်ပါသည်။</p>
        <p>This voucher is a legal document for bean trading transactions.</p>
      </div>
    </div>
  )
}
