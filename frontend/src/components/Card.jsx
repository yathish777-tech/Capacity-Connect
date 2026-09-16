export default function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-display font-semibold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
