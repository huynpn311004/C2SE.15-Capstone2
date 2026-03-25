import SectionCard from '../../components/staff/SectionCard'
import StatusBadge from '../../components/staff/StatusBadge'

const rows = [
  { id: 1, product: 'Milk 1L', remainingDays: 14 },
  { id: 2, product: 'Sliced Bread', remainingDays: 4 },
  { id: 3, product: 'Cheese Block', remainingDays: 1 },
  { id: 4, product: 'Soy Yogurt', remainingDays: 22 },
]

function getTone(days) {
  if (days <= 2) return { tone: 'danger', text: 'Critical' }
  if (days <= 7) return { tone: 'warning', text: 'Warning' }
  return { tone: 'safe', text: 'Safe' }
}

export default function ExpiryTracking() {
  return (
    <SectionCard title="Expiry Tracking" subtitle="Monitor remaining shelf life by product">
      <div className="space-y-3">
        {rows.map((row) => {
          const status = getTone(row.remainingDays)
          return (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 p-3">
              <div>
                <p className="font-semibold text-emerald-900">{row.product}</p>
                <p className="text-sm text-slate-500">Remaining: {row.remainingDays} day(s)</p>
              </div>
              <StatusBadge tone={status.tone}>{status.text}</StatusBadge>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
