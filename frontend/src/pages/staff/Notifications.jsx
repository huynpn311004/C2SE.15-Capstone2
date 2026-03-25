import SectionCard from '../../components/staff/SectionCard'
import StatusBadge from '../../components/staff/StatusBadge'

const notices = [
  {
    id: 1,
    title: 'Near-expiry warning',
    message: 'LOT-001 (Greek Yogurt) will expire in 4 days.',
    type: 'warning',
    time: '5 minutes ago',
  },
  {
    id: 2,
    title: 'New order received',
    message: 'Order ORD-1004 needs confirmation.',
    type: 'info',
    time: '12 minutes ago',
  },
  {
    id: 3,
    title: 'Donation request',
    message: 'Hope Foundation requested Milk 1L x 20.',
    type: 'danger',
    time: '30 minutes ago',
  },
]

export default function Notifications() {
  return (
    <SectionCard title="Notifications" subtitle="Recent operational alerts for staff">
      <div className="space-y-3">
        {notices.map((notice) => (
          <div key={notice.id} className="rounded-xl border border-emerald-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-emerald-900">{notice.title}</h4>
              <StatusBadge tone={notice.type}>{notice.type}</StatusBadge>
            </div>
            <p className="text-sm text-slate-600">{notice.message}</p>
            <p className="mt-2 text-xs text-slate-400">{notice.time}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
