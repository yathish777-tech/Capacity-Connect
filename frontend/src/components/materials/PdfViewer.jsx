export default function PdfViewer({ url, title }) {
  return (
    <iframe
      title={title}
      src={url}
      className="h-[65vh] min-h-[420px] w-full rounded border border-line bg-white"
    />
  )
}
