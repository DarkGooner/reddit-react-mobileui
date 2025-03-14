"use client"

import { useEffect, useRef, useState } from "react"
import * as dashjs from "dashjs"
import type { MediaInfo } from "@/lib/media-utils"

interface VideoPlayerProps {
  media: MediaInfo
}

export default function VideoPlayer({ media }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    // Cleanup previous player instance
    if (playerRef.current) {
      playerRef.current.destroy()
    }

    // Initialize dash.js player with optimized settings
    const player = dashjs.MediaPlayer().create()
    playerRef.current = player

    // Set up video element
    const videoElement = videoRef.current

    // Configure player settings for optimal performance
    player.updateSettings({
      streaming: {
        abr: {
          autoSwitchBitrate: {
            video: true,
            audio: true,
          },
          initialBitrate: {
            video: 2000,
            audio: 128,
          },
          maxBitrate: {
            video: 5000,
            audio: 256,
          },
          useDefaultABRRules: true,
        },
        buffer: {
          fastSwitchEnabled: true,
          bufferTimeAtTopQuality: 30,
          bufferTimeAtTopQualityLongForm: 60,
          longFormContentDurationThreshold: 600,
        },
      },
      debug: {
        logLevel: dashjs.Debug.LOG_LEVEL_WARNING,
      },
    })

    // Add event listeners for better error handling and loading states
    player.on(dashjs.MediaPlayer.events.ERROR, (error: any) => {
      console.error("Video player error:", error)
      setError("Failed to load video. Please try again.")
      setIsLoading(false)
    })

    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      setIsLoading(false)
    })

    // Initialize the player
    player.initialize(videoElement, media.url, true)

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [media.url])

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-red-500">{error}</div>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full rounded-lg"
        style={{ maxHeight: "80vh" }}
        controls
        playsInline
        poster={media.poster}
        preload="metadata"
      />
    </div>
  )
}

