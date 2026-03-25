export default function EmptyState({ title = 'No data', description = 'There is nothing to show yet.' }) {
  return (
    <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
      <p className="text-sm font-semibold text-emerald-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}
