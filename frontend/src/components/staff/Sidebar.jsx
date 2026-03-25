import {
  Bell,
  ClipboardList,
  Clock3,
  Gift,
  LayoutDashboard,
  Package,
  ShoppingCart,
  UserCircle,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const menuItems = [
  { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/inventory-lots', label: 'Inventory Lots', icon: Package },
  { to: '/staff/expiry-tracking', label: 'Expiry Tracking', icon: Clock3 },
  { to: '/staff/near-expiry', label: 'Near-Expiry Products', icon: ClipboardList },
  { to: '/staff/orders', label: 'Orders Management', icon: ShoppingCart },
  { to: '/staff/donations', label: 'Donation Management', icon: Gift },
  { to: '/staff/notifications', label: 'Notifications', icon: Bell },
  { to: '/staff/profile', label: 'Profile', icon: UserCircle },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-emerald-100 bg-white shadow-soft transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-emerald-100 px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">SEIMS Staff</p>
            <h2 className="text-sm font-bold text-emerald-900">Store Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {open && (
        <button
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Backdrop"
        />
      )}
    </>
  )
}
