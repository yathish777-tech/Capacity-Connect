import { Loader2 } from 'lucide-react'

export default function Loader({ full = false, label = 'Loading' }) {
  const content = (
    <div className="flex items-center gap-2 text-ink/60">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )

  if (!full) return content

  return <div className="min-h-screen flex items-center justify-center bg-paper">{content}</div>
}
