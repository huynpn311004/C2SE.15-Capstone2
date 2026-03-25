const toneMap = {
  safe: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
  gray: 'bg-slate-100 text-slate-700',
}

export default function StatusBadge({ children, tone = 'gray' }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}>
      {children}
    </span>
  )
}
