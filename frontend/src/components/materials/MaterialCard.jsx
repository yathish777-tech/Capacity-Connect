import { Download, ExternalLink, File, FileText, Play, RefreshCw, Trash2, Video } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import { formatFileSize, isPresentation, isVideo, uploadDate } from './materialUtils'

function MaterialIcon({ material }) {
  if (isVideo(material)) return <Video className="h-5 w-5 text-teal-700" />
  if (material.file_type === 'pdf') return <FileText className="h-5 w-5 text-teal-700" />
  if (isPresentation(material)) return <FileText className="h-5 w-5 text-teal-700" />
  return <File className="h-5 w-5 text-teal-700" />
}

export default function MaterialCard({ material, courseTitle, onView, onDownload, onReplace, onDelete, busy }) {
  const viewLabel = isVideo(material) ? 'Play' : isPresentation(material) ? 'Open' : 'View'
  const ViewIcon = isVideo(material) ? Play : ExternalLink

  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded bg-paper p-2">
          <MaterialIcon material={material} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{material.title}</h3>
              <p className="truncate text-sm text-ink/60">{material.file_name || 'File name unavailable'}</p>
            </div>
            {material.status && <StatusBadge status={material.status} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/50">
            <span className="uppercase">{material.file_type}</span>
            <span>{formatFileSize(material.file_size)}</span>
            <span>{uploadDate(material)}</span>
            {courseTitle && <span>{courseTitle}</span>}
            {material.uploaded_by && <span>Uploaded by #{material.uploaded_by}</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onView(material)} className="btn-primary px-3 py-1.5 text-sm">
          <ViewIcon className="h-4 w-4" /> {viewLabel}
        </button>
        {onDownload && (
          <button onClick={() => onDownload(material)} className="btn-secondary px-3 py-1.5 text-sm">
            <Download className="h-4 w-4" /> Download
          </button>
        )}
        {onReplace && (
          <button onClick={() => onReplace(material)} className="btn-secondary px-3 py-1.5 text-sm">
            <RefreshCw className="h-4 w-4" /> Replace
          </button>
        )}
        {onDelete && (
          <button disabled={busy} onClick={() => onDelete(material)} className="btn-danger px-3 py-1.5 text-sm">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
    </div>
  )
}
