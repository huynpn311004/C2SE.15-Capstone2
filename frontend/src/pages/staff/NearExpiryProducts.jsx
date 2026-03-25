import { useMemo, useState } from 'react'
import EmptyState from '../../components/staff/EmptyState'
import SectionCard from '../../components/staff/SectionCard'
import StatusBadge from '../../components/staff/StatusBadge'

const data = [
  { id: 1, product: 'Greek Yogurt', lotCode: 'LOT-001', daysLeft: 4, discount: 20 },
  { id: 2, product: 'Salad Box', lotCode: 'LOT-019', daysLeft: 2, discount: 35 },
  { id: 3, product: 'Sandwich', lotCode: 'LOT-032', daysLeft: 1, discount: 40 },
]

export default function NearExpiryProducts() {
  const [maxDays, setMaxDays] = useState(7)
  const [applied, setApplied] = useState({})

  const filtered = useMemo(() => data.filter((item) => item.daysLeft <= maxDays), [maxDays])

  function applyDiscount(id) {
    setApplied((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <SectionCard
      title="Near-Expiry Products"
      subtitle="Filter and apply suggested discount"
      right={
        <select
          value={maxDays}
          onChange={(e) => setMaxDays(Number(e.target.value))}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
        >
          <option value={3}>≤ 3 days</option>
          <option value={7}>≤ 7 days</option>
          <option value={14}>≤ 14 days</option>
        </select>
      }
    >
      {!filtered.length ? (
        <EmptyState title="No near-expiry products" description="Try changing your filter range." />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
              <div>
                <p className="font-semibold text-emerald-900">{item.product}</p>
                <p className="text-sm text-slate-600">
                  {item.lotCode} • {item.daysLeft} day(s) left
                </p>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge tone={item.daysLeft <= 2 ? 'danger' : 'warning'}>
                  Suggested {item.discount}%
                </StatusBadge>
                <button
                  onClick={() => applyDiscount(item.id)}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  {applied[item.id] ? 'Discount Applied' : 'Apply Discount'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
