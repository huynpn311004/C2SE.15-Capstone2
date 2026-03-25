import { useState } from 'react'
import SectionCard from '../../components/staff/SectionCard'
import StatusBadge from '../../components/staff/StatusBadge'

const offerSeed = [
  { id: 1, product: 'Bread Combo', quantity: 18, status: 'Pending' },
  { id: 2, product: 'Fruit Pack', quantity: 12, status: 'Approved' },
]

const requestSeed = [
  { id: 11, organization: 'Hope Foundation', request: 'Milk 1L x 20', status: 'Pending' },
  { id: 12, organization: 'Green Hands', request: 'Snack Pack x 30', status: 'Pending' },
]

function DonationList({ title, rows, onDecision }) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-100 p-3">
      <h4 className="text-sm font-bold text-emerald-900">{title}</h4>
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
          <div>
            <p className="font-semibold text-slate-800">{row.product || row.organization}</p>
            <p className="text-sm text-slate-500">{row.request || `Quantity: ${row.quantity}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={row.status === 'Approved' ? 'safe' : row.status === 'Rejected' ? 'danger' : 'warning'}>
              {row.status}
            </StatusBadge>
            <button
              onClick={() => onDecision(row.id, 'Approved')}
              className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Approve
            </button>
            <button
              onClick={() => onDecision(row.id, 'Rejected')}
              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DonationManagement() {
  const [offers, setOffers] = useState(offerSeed)
  const [requests, setRequests] = useState(requestSeed)

  return (
    <SectionCard title="Donation Management" subtitle="Review donation offers and incoming requests">
      <div className="grid gap-4 lg:grid-cols-2">
        <DonationList
          title="Donation Offers"
          rows={offers}
          onDecision={(id, status) => setOffers((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))}
        />

        <DonationList
          title="Donation Requests"
          rows={requests}
          onDecision={(id, status) =>
            setRequests((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
          }
        />
      </div>
    </SectionCard>
  )
}
