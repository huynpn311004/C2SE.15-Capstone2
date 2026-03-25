export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-3 sm:px-5">
          <h4 className="text-base font-bold text-emerald-900">{title}</h4>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && <div className="border-t border-emerald-100 px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>
  )
}
