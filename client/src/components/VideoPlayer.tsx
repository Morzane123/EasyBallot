import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  style?: React.CSSProperties
}

export default function VideoPlayer({ src, poster, className, style }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const isHls = src.endsWith('.m3u8')

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      })
      hls.loadSource(src)
      hls.attachMedia(video)

      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生 HLS
      video.src = src
    } else {
      // 普通 mp4/webm
      video.src = src
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      poster={poster}
      className={className}
      style={{
        width: '100%',
        maxHeight: '400px',
        borderRadius: 'var(--radius)',
        background: '#000',
        ...style,
      }}
    />
  )
}
