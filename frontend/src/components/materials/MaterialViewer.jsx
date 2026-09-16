import { useEffect, useState } from 'react'
import { Download, ExternalLink, X } from 'lucide-react'
import Loader from '../Loader'
import PdfViewer from './PdfViewer'
import VideoPlayer from './VideoPlayer'
import FilePreview from './FilePreview'
import { isPdf, isPresentation, isVideo } from './materialUtils'

function friendlyMessage(error) {
  const status = error?.response?.status
  if (status === 401 || status === 403) return 'You do not have permission to view this material.'
  if (status === 404) return 'Unable to load this material. Please try again.'
  if (status === 503) return 'File storage is not available right now. Please try again later.'
  return 'Unable to load this material. Please try again.'
}

export default function MaterialViewer({ material, open, onClose, getUrl }) {
  const [urlInfo, setUrlInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !material) return
    setUrlInfo(null)
    setError('')
    getUrl(material)
      .then(setUrlInfo)
      .catch((err) => setError(friendlyMessage(err)))
  }, [open, material, getUrl])

  if (!open || !material) return null

  const url = urlInfo?.url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/55 px-3 py-4">
      <div className="card flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold">{material.title}</h2>
            <p className="truncate text-sm text-ink/60">{material.file_name || 'File name unavailable'}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-ink/50 hover:bg-paper hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-[360px] flex-1 overflow-auto p-4">
          {!url && !error && <Loader label="Loading material..." />}
          {error && (
            <div className="flex min-h-[320px] items-center justify-center rounded border border-line bg-paper p-6 text-center text-ink/70">
              {error}
            </div>
          )}
          {url && isPdf(material) && <PdfViewer url={url} title={material.title} />}
          {url && isVideo(material) && <VideoPlayer url={url} title={material.title} mimeType={urlInfo.mime_type || material.mime_type} />}
          {url && !isPdf(material) && !isVideo(material) && <FilePreview material={material} url={url} />}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4">
          <span className="text-xs uppercase text-ink/50">
            {isPresentation(material) ? 'Presentation files open best in PowerPoint or a compatible viewer.' : material.file_type}
          </span>
          <div className="flex flex-wrap gap-2">
            {url && (
              <>
                <a href={url} download={material.file_name || material.title} className="btn-secondary">
                  <Download className="h-4 w-4" /> Download
                </a>
                <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">
                  <ExternalLink className="h-4 w-4" /> Open in New Tab
                </a>
              </>
            )}
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
