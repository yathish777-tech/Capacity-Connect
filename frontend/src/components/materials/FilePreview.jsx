import { Download, ExternalLink, FileText } from 'lucide-react'

export default function FilePreview({ material, url }) {
  const isPresentation = material.file_type === 'ppt'

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded border border-dashed border-line bg-paper p-6 text-center">
      <FileText className="mb-3 h-10 w-10 text-teal-700" />
      <h3 className="font-display text-lg font-semibold">
        {isPresentation ? 'Presentation preview is not available here' : 'Preview is not available for this file type'}
      </h3>
      <p className="mt-2 max-w-md text-sm text-ink/60">
        Use open or download to view this file with an application that supports it.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">
          <ExternalLink className="h-4 w-4" /> Open
        </a>
        <a href={url} download={material.file_name || material.title} className="btn-primary">
          <Download className="h-4 w-4" /> Download
        </a>
      </div>
    </div>
  )
}
