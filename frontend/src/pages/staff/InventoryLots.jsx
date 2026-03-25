import { useMemo, useState } from 'react'
import EmptyState from '../../components/staff/EmptyState'
import Modal from '../../components/staff/Modal'
import SectionCard from '../../components/staff/SectionCard'
import StatusBadge from '../../components/staff/StatusBadge'

const initialLots = [
  { id: 1, lotCode: 'LOT-001', productName: 'Greek Yogurt', quantity: 80, expiryDate: '2026-04-10', status: 'Near-expiry' },
  { id: 2, lotCode: 'LOT-002', productName: 'Orange Juice', quantity: 120, expiryDate: '2026-06-01', status: 'New' },
  { id: 3, lotCode: 'LOT-003', productName: 'Fresh Bread', quantity: 32, expiryDate: '2026-03-26', status: 'Expired' },
]

const defaultForm = { id: null, lotCode: '', productName: '', quantity: '', expiryDate: '', status: 'New' }

export default function InventoryLots() {
  const [lots, setLots] = useState(initialLots)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const sortedLots = useMemo(
    () => [...lots].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    [lots],
  )

  function openCreate() {
    setForm(defaultForm)
    setModalOpen(true)
  }

  function openEdit(lot) {
    setForm(lot)
    setModalOpen(true)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (form.id) {
      setLots((prev) => prev.map((item) => (item.id === form.id ? { ...form, quantity: Number(form.quantity) } : item)))
    } else {
      setLots((prev) => [...prev, { ...form, id: Date.now(), quantity: Number(form.quantity) }])
    }

    setModalOpen(false)
  }

  return (
    <SectionCard
      title="Inventory Lot Management"
      subtitle="Manage lot-level inventory with expiry status"
      right={
        <button onClick={openCreate} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Create Lot
        </button>
      }
    >
      {!sortedLots.length ? (
        <EmptyState title="No inventory lots yet" description="Create your first lot to start tracking expiry." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-3">Lot Code</th>
                <th className="py-3 pr-3">Product Name</th>
                <th className="py-3 pr-3">Quantity</th>
                <th className="py-3 pr-3">Expiry Date</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLots.map((lot) => (
                <tr key={lot.id} className="border-b border-emerald-50">
                  <td className="py-3 pr-3 font-medium text-emerald-900">{lot.lotCode}</td>
                  <td className="py-3 pr-3">{lot.productName}</td>
                  <td className="py-3 pr-3">{lot.quantity}</td>
                  <td className="py-3 pr-3">{lot.expiryDate}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge
                      tone={lot.status === 'New' ? 'safe' : lot.status === 'Near-expiry' ? 'warning' : 'danger'}
                    >
                      {lot.status}
                    </StatusBadge>
                  </td>
                  <td className="py-3">
                    <button onClick={() => openEdit(lot)} className="text-sm font-semibold text-emerald-700 hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit Lot' : 'Create Lot'}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
              Save
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Lot Code
            <input value={form.lotCode} onChange={(e) => setForm({ ...form, lotCode: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm">Product Name
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm">Quantity
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm">Expiry Date
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm sm:col-span-2">Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option>New</option>
              <option>Near-expiry</option>
              <option>Expired</option>
            </select>
          </label>
        </form>
      </Modal>
    </SectionCard>
  )
}
