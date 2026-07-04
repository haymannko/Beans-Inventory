/** Footer fields matching Bouncher.png exactly */
export default function VoucherSignature() {
  return (
    <div className="mt-4 pt-2 text-sm">
      {/* Row 1: ကားခ + လက်ခံရရှိ */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="ကားခ" />
        <FieldLine label="လက်ခံရရှိ" />
      </div>
      {/* Row 2: ချိန်ခ + မှတ်ချက် */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="ချိန်ခ" />
        <FieldLine label="မှတ်ချက်" />
      </div>
      {/* Row 3: ချခ + ထောက်ခံ */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="ချခ" />
        <FieldLine label="ထောက်ခံ" />
      </div>
      {/* Row 4: ကော်မရှင်ခ + လက်မှတ် */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="ကော်မရှင်ခ" />
        <FieldLine label="လက်မှတ်" />
      </div>
      {/* Row 5: အသုံး (left only) */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="အသုံး" />
        <div className="flex-1" />
      </div>
      {/* Row 6: ခုနှိမ်ငွေ (left only) */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="ခုနှိမ်ငွေ" />
        <div className="flex-1" />
      </div>
      {/* Totals row: စုစုပေါင်း ခုနှိမ်ငွေ (full width) */}
      <div className="flex gap-6 mb-1">
        <FieldLine label="စုစုပေါင်း ခုနှိမ်ငွေ" />
        <div className="flex-1" />
      </div>
      {/* Remaining: ကျန်ငွေ (full width) */}
      <div className="flex gap-6">
        <FieldLine label="ကျန်ငွေ" />
        <div className="flex-1" />
      </div>
    </div>
  )
}

function FieldLine({ label }: { label: string }) {
  return (
    <div className="flex items-baseline gap-1.5 flex-1">
      <span
        className="font-semibold whitespace-nowrap text-sm"
        style={{ color: '#c0392b' }}
      >
        {label} -
      </span>
      <span
        className="flex-1"
        style={{ borderBottom: '1px dashed #b0a090', minWidth: 40 }}
      >
        &nbsp;
      </span>
    </div>
  )
}
