import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4">
      <div className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
