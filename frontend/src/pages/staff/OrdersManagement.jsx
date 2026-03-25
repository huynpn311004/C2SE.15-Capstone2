import { useState } from 'react'
import EmptyState from '../../components/staff/EmptyState'
import Modal from '../../components/staff/Modal'
import SectionCard from '../../components/staff/SectionCard'
import StatusBadge from '../../components/staff/StatusBadge'

const initialOrders = [
  { id: 'ORD-1001', customer: 'Nguyen Minh', status: 'Pending', items: 3, amount: '420,000 VND' },
  { id: 'ORD-1002', customer: 'Le Trang', status: 'Confirmed', items: 2, amount: '185,000 VND' },
  { id: 'ORD-1003', customer: 'Pham Huy', status: 'Preparing', items: 5, amount: '690,000 VND' },
]

export default function OrdersManagement() {
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)

  function updateStatus(id, next) {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status: next } : order)))
    setSelectedOrder((prev) => (prev && prev.id === id ? { ...prev, status: next } : prev))
  }

  return (
    <SectionCard title="Orders Management" subtitle="Confirm and update incoming orders">
      {!orders.length ? (
        <EmptyState title="No orders today" description="New orders will appear in real-time here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-3">Order ID</th>
                <th className="py-3 pr-3">Customer</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-emerald-50">
                  <td className="py-3 pr-3 font-semibold text-emerald-900">{order.id}</td>
                  <td className="py-3 pr-3">{order.customer}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge tone={order.status === 'Pending' ? 'warning' : 'safe'}>{order.status}</StatusBadge>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, 'Confirmed')}
                        className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        footer={
          selectedOrder && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => updateStatus(selectedOrder.id, 'Preparing')}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Update to Preparing
              </button>
            </div>
          )
        }
      >
        {selectedOrder && (
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Order ID:</span> {selectedOrder.id}</p>
            <p><span className="font-semibold">Customer:</span> {selectedOrder.customer}</p>
            <p><span className="font-semibold">Total Items:</span> {selectedOrder.items}</p>
            <p><span className="font-semibold">Amount:</span> {selectedOrder.amount}</p>
            <p><span className="font-semibold">Status:</span> {selectedOrder.status}</p>
          </div>
        )}
      </Modal>
    </SectionCard>
  )
}
