export default function SectionCard({ title, subtitle, right, children }) {
  return (
    <section className="animate-fadeIn rounded-2xl border border-emerald-100 bg-white shadow-sm">
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-4 py-3 sm:px-5">
          <div>
            {title && <h3 className="text-sm font-bold text-emerald-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
