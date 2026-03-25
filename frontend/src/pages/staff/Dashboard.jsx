import { useEffect, useState } from 'react'
import { BarChart3, Boxes, Clock3, ShoppingBag } from 'lucide-react'
import SectionCard from '../../components/staff/SectionCard'
import LoadingSkeleton from '../../components/staff/LoadingSkeleton'

const cards = [
  { label: 'Total Inventory Lots', value: 126, icon: Boxes },
  { label: 'Near-expiry Products', value: 18, icon: Clock3 },
  { label: 'Orders Today', value: 42, icon: ShoppingBag },
]

export default function Dashboard() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <LoadingSkeleton rows={5} />
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Staff Dashboard" subtitle="Overview of inventory, expiry and order activity">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.label} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600">{card.label}</p>
                  <Icon size={18} className="text-emerald-700" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-900">{card.value}</p>
              </article>
            )
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Near-expiry by Category"
          subtitle="Mock chart"
          right={<BarChart3 size={18} className="text-emerald-600" />}
        >
          <div className="space-y-3">
            {[
              { name: 'Dairy', percent: 72 },
              { name: 'Beverages', percent: 46 },
              { name: 'Bakery', percent: 58 },
              { name: 'Fresh Food', percent: 34 },
            ].map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="font-semibold text-emerald-700">{item.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-emerald-100">
                  <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Orders Trend" subtitle="Last 7 days">
          <div className="flex h-44 items-end justify-between gap-2">
            {[18, 22, 15, 30, 25, 32, 28].map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-emerald-500/80" style={{ height: `${value * 3}px` }} />
                <span className="text-xs text-slate-500">D{index + 1}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
