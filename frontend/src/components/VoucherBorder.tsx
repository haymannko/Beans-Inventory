/** Traditional Myanmar voucher ornate double-border wrapper — matches Bouncher.png */
export default function VoucherBorder({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto print:mx-0"
      style={{
        maxWidth: 820,
        background: '#fdf0ec',
        fontFamily: '"Noto Sans Myanmar", "Pyidaungsu", "Myanmar Text", "Tharlon", serif',
      }}
    >
      {/* Outer thick border */}
      <div
        className="relative"
        style={{ border: '3px solid #c0392b', margin: 6 }}
      >
        {/* Inner thin border */}
        <div
          className="relative"
          style={{ border: '1px solid #c0392b', margin: 4 }}
        >
          {/* Corner L-brackets */}
          <svg className="absolute -top-px -left-px w-4 h-4" viewBox="0 0 16 16">
            <path d="M0,0 L8,0 L8,1.2 L1.2,1.2 L1.2,8 L0,8 Z" fill="#c0392b" />
          </svg>
          <svg className="absolute -top-px -right-px w-4 h-4" viewBox="0 0 16 16">
            <path d="M16,0 L8,0 L8,1.2 L14.8,1.2 L14.8,8 L16,8 Z" fill="#c0392b" />
          </svg>
          <svg className="absolute -bottom-px -left-px w-4 h-4" viewBox="0 0 16 16">
            <path d="M0,16 L8,16 L8,14.8 L1.2,14.8 L1.2,8 L0,8 Z" fill="#c0392b" />
          </svg>
          <svg className="absolute -bottom-px -right-px w-4 h-4" viewBox="0 0 16 16">
            <path d="M16,16 L8,16 L8,14.8 L14.8,14.8 L14.8,8 L16,8 Z" fill="#c0392b" />
          </svg>
          {/* Content area */}
          <div className="px-4 py-3">{children}</div>
        </div>
      </div>
    </div>
  )
}
