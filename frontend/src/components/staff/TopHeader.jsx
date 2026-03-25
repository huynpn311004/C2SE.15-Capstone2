import { Menu, Search } from 'lucide-react'

export default function TopHeader({ onOpenSidebar }) {
  return (
    <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="hidden flex-1 items-center gap-2 rounded-xl border border-emerald-100 px-3 py-2 text-sm text-slate-500 md:flex">
          <Search size={16} />
          <span>Search lots, products, orders...</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Staff Mode
          </div>
          <div className="size-9 rounded-full bg-emerald-600 text-center text-sm font-bold leading-9 text-white">ST</div>
        </div>
      </div>
    </header>
  )
}
