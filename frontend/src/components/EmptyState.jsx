export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-10 text-ink/50">
      {Icon && <Icon className="h-8 w-8 mx-auto mb-3 opacity-50" />}
      <p className="font-medium text-ink/70">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  )
}
