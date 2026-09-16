export default function VideoPlayer({ url, title, mimeType }) {
  return (
    <video
      controls
      className="max-h-[65vh] min-h-[260px] w-full rounded bg-black"
      preload="metadata"
      title={title}
    >
      <source src={url} type={mimeType || 'video/mp4'} />
      Your browser cannot play this video.
    </video>
  )
}
