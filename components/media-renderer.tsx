"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useInView } from "react-intersection-observer"
import { getMediaInfo, getOptimalDimensions } from "@/lib/media-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  Loader2,
  Play,
  Pause,
  Settings,
  ExternalLink,
  RefreshCcw,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface VideoQuality {
  quality: string
  url: string
  width: number
  height: number
}

interface MediaRendererProps {
  post: any
  className?: string
  maxWidth?: number
  maxHeight?: number
  onLoad?: () => void
  onError?: (error: string) => void
  onVote?: (direction: "up" | "down") => void
  onComment?: () => void
  onShare?: () => void
  onSave?: () => void
}

export default function MediaRenderer({
  post,
  className,
  maxWidth = 800,
  maxHeight = 800,
  onLoad,
  onError,
}: MediaRendererProps) {
  const [mediaInfo, setMediaInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [showQualitySelector, setShowQualitySelector] = useState(false)
  const [currentQuality, setCurrentQuality] = useState<string>("auto")
  const [showControls, setShowControls] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isBuffering, setIsBuffering] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const volumeSliderRef = useRef<HTMLDivElement>(null)
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  })
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const { toast } = useToast()

  useEffect(() => {
    const loadMediaInfo = async () => {
      try {
        setLoading(true)
        setError(null)
        const info = await getMediaInfo(post)
        setMediaInfo(info)
      } catch (err) {
        console.error("Error loading media:", err)
        setError("Failed to load media")
        if (onError) onError("Failed to load media")
      } finally {
        setLoading(false)
      }
    }

    loadMediaInfo()
  }, [post, onError])

  useEffect(() => {
    if (mediaInfo?.type === "vreddit" && videoRef.current) {
      const video = videoRef.current

      // Set initial mute state and volume
      video.muted = isMuted
      video.volume = volume

      // For v.redd.it videos, we'll use the direct video URL instead of dash.js
      // This helps avoid CORS issues and simplifies playback
      if (mediaInfo.videoQualities?.length > 0) {
        const videoUrl = mediaInfo.videoQualities[0].url
        video.src = videoUrl
        setCurrentQuality(mediaInfo.videoQualities[0].quality)
      } else if (mediaInfo.url) {
        video.src = mediaInfo.url
      }

      // Add event listeners for better playback control
      const handlePlay = () => setIsPlaying(true)
      const handlePause = () => setIsPlaying(false)
      const handleEnded = () => setIsPlaying(false)
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime)
        setProgress((video.currentTime / video.duration) * 100)
      }
      const handleDurationChange = () => setDuration(video.duration)
      const handleWaiting = () => setIsBuffering(true)
      const handlePlaying = () => setIsBuffering(false)
      const handleError = (e: Event) => {
        console.error("Video error:", e)
        setError("Failed to load video. Tap to retry.")
        setIsBuffering(false)
      }

      video.addEventListener("play", handlePlay)
      video.addEventListener("pause", handlePause)
      video.addEventListener("ended", handleEnded)
      video.addEventListener("timeupdate", handleTimeUpdate)
      video.addEventListener("durationchange", handleDurationChange)
      video.addEventListener("waiting", handleWaiting)
      video.addEventListener("playing", handlePlaying)
      video.addEventListener("error", handleError)

      if (audioRef.current && mediaInfo.audioUrl) {
        audioRef.current.src = mediaInfo.audioUrl
        audioRef.current.muted = isMuted
        audioRef.current.volume = volume
      }

      // Return cleanup function
      return () => {
        if (video) {
          video.removeEventListener("play", handlePlay)
          video.removeEventListener("pause", handlePause)
          video.removeEventListener("ended", handleEnded)
          video.removeEventListener("timeupdate", handleTimeUpdate)
          video.removeEventListener("durationchange", handleDurationChange)
          video.removeEventListener("waiting", handleWaiting)
          video.removeEventListener("playing", handlePlaying)
          video.removeEventListener("error", handleError)
        }
      }
    }
  }, [mediaInfo, isMuted, volume])

  // Handle video playback
  useEffect(() => {
    if (videoRef.current) {
      if (inView) {
        if (isPlaying) {
          videoRef.current.play().catch((err) => {
            console.error("Autoplay failed:", err)
            // Don't show error for autoplay failures as they're expected on mobile
          })
        }
      } else {
        videoRef.current.pause()
      }
    }
  }, [inView, isPlaying])

  // Handle click outside volume slider
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleImageLoad = () => {
    setImageLoading(false)
    onLoad?.()
  }

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && videoRef.current) {
      // Sync video time with audio time
      const timeDiff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime)
      if (timeDiff > 0.1) {
        // Only sync if difference is more than 0.1 seconds
        videoRef.current.currentTime = audioRef.current.currentTime
      }
    }
  }

  const handleAudioEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.pause()
    }
  }

  const handleQualityChange = (quality: string) => {
    if (!videoRef.current || !mediaInfo?.videoQualities) return

    const selectedQuality = mediaInfo.videoQualities.find((q: VideoQuality) => q.quality === quality)
    if (selectedQuality) {
      setCurrentQuality(quality)

      // Save current playback state
      const currentTime = videoRef.current.currentTime
      const wasPlaying = !videoRef.current.paused

      // Change video source
      videoRef.current.src = selectedQuality.url
      videoRef.current.load()

      // Restore playback state
      videoRef.current.currentTime = currentTime
      if (wasPlaying) {
        videoRef.current.play().catch((err) => {
          console.error("Failed to resume after quality change:", err)
        })
      }

      setShowQualitySelector(false)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        if (audioRef.current) {
          audioRef.current.pause()
        }
      } else {
        videoRef.current.play().catch((err) => {
          console.error("Failed to play video:", err)
          toast({
            title: "Playback Error",
            description: "Could not play video. Try again or check your connection.",
            variant: "destructive",
          })
        })
        if (audioRef.current) {
          audioRef.current.play().catch((err) => {
            console.error("Failed to play audio:", err)
          })
        }
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0] / 100
    setVolume(volumeValue)
    setIsMuted(volumeValue === 0)

    if (videoRef.current) {
      videoRef.current.volume = volumeValue
      videoRef.current.muted = volumeValue === 0
    }

    if (audioRef.current) {
      audioRef.current.volume = volumeValue
      audioRef.current.muted = volumeValue === 0
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !mediaInfo?.gallery) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      setCurrentGalleryIndex((prev) => (prev + 1) % mediaInfo.gallery.length)
      setImageLoading(true)
    }
    if (isRightSwipe) {
      setCurrentGalleryIndex((prev) => (prev - 1 + mediaInfo.gallery.length) % mediaInfo.gallery.length)
      setImageLoading(true)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const newTime = pos * videoRef.current.duration
    videoRef.current.currentTime = newTime
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    setError(null)
    setLoading(true)

    // Reload media info
    const loadMediaInfo = async () => {
      try {
        const info = await getMediaInfo(post)
        setMediaInfo(info)

        // For videos, reload the video element
        if (videoRef.current && (info.type === "video" || info.type === "vreddit")) {
          const video = videoRef.current

          if (info.videoQualities?.length > 0) {
            video.src = info.videoQualities[0].url
          } else if (info.url) {
            video.src = info.url
          }

          video.load()
        }
      } catch (err) {
        console.error("Error reloading media:", err)
        setError("Failed to load media after retry")
        if (onError) onError("Failed to load media after retry")
      } finally {
        setLoading(false)
      }
    }

    loadMediaInfo()
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-muted h-48 rounded-md flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-muted h-48 rounded-md flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(post.url, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Original
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!mediaInfo) {
    return (
      <div className="bg-muted h-48 rounded-md flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No media available</p>
          <Button variant="outline" size="sm" onClick={() => window.open(post.url, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Original
          </Button>
        </div>
      </div>
    )
  }

  const { width, height } = getOptimalDimensions(mediaInfo.width, mediaInfo.height, maxWidth, maxHeight)

  const renderMedia = (isDialog = false) => {
    if (!mediaInfo) return null

    // Enhanced gallery item detection and extraction
    const currentMedia =
      mediaInfo.type === "gallery" && mediaInfo.gallery && mediaInfo.gallery.length > 0
        ? mediaInfo.gallery[currentGalleryIndex]
        : mediaInfo

    const containerClass = cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)

    // Dedicated function for rendering gallery
    if (mediaInfo.type === "gallery" && mediaInfo.gallery && mediaInfo.gallery.length > 0) {
      return (
        <div
          className={containerClass}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            maxWidth: width,
            aspectRatio: currentMedia?.aspectRatio ? `${currentMedia.aspectRatio}` : "16/9",
            backgroundColor: "black",
          }}
        >
          {/* Render the current gallery item */}
          {renderGalleryItem(currentMedia, isDialog)}

          {/* Swipe indicator overlay */}
          <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
            <div className="h-full w-12 flex items-center justify-center">
              <div className="bg-black/30 rounded-full p-1 text-white">
                <ChevronLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="h-full w-12 flex items-center justify-center">
              <div className="bg-black/30 rounded-full p-1 text-white">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Gallery Controls */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2 bg-black/70 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrentGalleryIndex((prev) => (prev - 1 + mediaInfo.gallery!.length) % mediaInfo.gallery!.length)
                setImageLoading(true)
              }}
              className="h-8 w-8 text-white hover:bg-white/20"
              disabled={mediaInfo.gallery.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-white font-medium">
              {currentGalleryIndex + 1} / {mediaInfo.gallery.length}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrentGalleryIndex((prev) => (prev + 1) % mediaInfo.gallery!.length)
                setImageLoading(true)
              }}
              className="h-8 w-8 text-white hover:bg-white/20"
              disabled={mediaInfo.gallery.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Caption if available */}
          {currentMedia.caption && (
            <div className="absolute bottom-12 left-0 right-0 bg-black/70 text-white p-2 text-sm">
              {currentMedia.caption}
            </div>
          )}
        </div>
      )
    }

    // For non-gallery media
    return renderSingleMedia(currentMedia, isDialog)
  }

  // New function to render a single gallery item
  const renderGalleryItem = (item: any, isDialog = false) => {
    if (!item) return null

    if (item.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <Image
            src={item.url || "/placeholder.svg"}
            alt={`Gallery image ${currentGalleryIndex + 1}`}
            width={item.width || width}
            height={item.height || height}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100",
            )}
            onLoad={handleImageLoad}
            priority={!isDialog && currentGalleryIndex === 0}
          />
        </div>
      )
    }

    if (item.type === "video") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <video
            src={item.url}
            controls
            playsInline
            className="max-h-[90vh] max-w-full"
            onLoadStart={() => setImageLoading(true)}
            onLoadedData={() => {
              setImageLoading(false)
              onLoad?.()
            }}
          />
        </div>
      )
    }

    if (item.type === "gif") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src={item.url || "/placeholder.svg"}
            alt={`Gallery GIF ${currentGalleryIndex + 1}`}
            width={item.width || width}
            height={item.height || height}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100",
            )}
            onLoad={handleImageLoad}
            priority={!isDialog && currentGalleryIndex === 0}
          />
        </div>
      )
    }

    // Fallback
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-muted-foreground">Unsupported content type</p>
      </div>
    )
  }

  // Function for rendering non-gallery media
  const renderSingleMedia = (media: any, isDialog = false) => {
    if (!media) return null

    const mediaClass = cn(
      "w-full h-full object-contain transition-opacity duration-300",
      isDialog ? "max-h-[90vh]" : `max-h-[${maxHeight}px]`,
      imageLoading ? "opacity-0" : "opacity-100",
    )

    switch (media.type) {
      case "image":
      case "iredd-image":
        return (
          <div
            className={cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)}
            style={{
              maxWidth: width,
              aspectRatio: media.aspectRatio ? `${media.aspectRatio}` : undefined,
              backgroundColor: "black",
            }}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <Image
              src={media.url || "/placeholder.svg"}
              alt={post.title || ""}
              width={width}
              height={height}
              className={mediaClass}
              onLoad={handleImageLoad}
              priority={!isDialog}
            />

            {!isDialog && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )

      case "video":
      case "vreddit":
        return (
          <div
            className={cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)}
            style={{
              maxWidth: width,
              aspectRatio: media.aspectRatio ? `${media.aspectRatio}` : "16/9",
              backgroundColor: "black",
              minHeight: "200px",
              position: "relative",
            }}
            onMouseEnter={() => {
              setShowControls(true)
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current)
              }
            }}
            onMouseLeave={() => {
              controlsTimeoutRef.current = setTimeout(() => {
                if (!isPlaying) return
                setShowControls(false)
              }, 2000)
            }}
            onMouseMove={() => {
              setShowControls(true)
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current)
              }
              controlsTimeoutRef.current = setTimeout(() => {
                if (!isPlaying) return
                setShowControls(false)
              }, 2000)
            }}
            onClick={() => togglePlayPause()}
          >
            <video
              ref={videoRef}
              className={cn(
                "w-full h-full object-contain transition-opacity duration-300",
                imageLoading ? "opacity-0" : "opacity-100",
              )}
              playsInline
              poster={media.poster}
              controls={false}
              preload="metadata"
              style={{
                maxHeight: "100%",
                width: "100%",
                height: "auto",
                display: "block",
                cursor: "pointer",
              }}
            />
            {media.audioUrl && (
              <audio
                ref={audioRef}
                src={media.audioUrl}
                preload="auto"
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={handleAudioEnded}
              />
            )}

            {/* Mobile-friendly Video Controls Overlay */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-200",
                showControls || !isPlaying ? "opacity-100" : "opacity-0",
              )}
              onClick={(e) => {
                e.stopPropagation()
                togglePlayPause()
              }}
            >
              {/* Center Play/Pause Button */}
              {(isBuffering || !isPlaying) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {isBuffering ? (
                    <Loader2 className="h-12 w-12 animate-spin text-white/80" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePlayPause()
                      }}
                    >
                      {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                    </Button>
                  )}
                </div>
              )}

              {/* Bottom Controls */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-200",
                  showControls || !isPlaying ? "opacity-100" : "opacity-0",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress Bar */}
                <div
                  className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4"
                  onClick={handleProgressBarClick}
                >
                  <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePlayPause()
                      }}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <div className="relative" ref={volumeSliderRef}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleMute()
                        }}
                        onMouseEnter={() => setShowVolumeSlider(true)}
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>

                      {showVolumeSlider && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/80 rounded-md w-24 transition-opacity">
                          <Slider
                            value={[isMuted ? 0 : volume * 100]}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                            className="h-1"
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-white">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {media.videoQualities?.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {media.videoQualities.map((q: VideoQuality) => (
                            <DropdownMenuItem
                              key={q.quality}
                              onClick={() => handleQualityChange(q.quality)}
                              className={currentQuality === q.quality ? "bg-accent" : ""}
                            >
                              {q.quality}p
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {!isDialog && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/10"
                        onClick={() => setIsFullscreen(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "redgif":
      case "gfycat":
      case "streamable":
      case "youtube":
      case "twitch":
        return (
          <div
            className={cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)}
            style={{
              maxWidth: width,
              paddingBottom: "56.25%", // 16:9 aspect ratio
            }}
          >
            <iframe
              src={media.url}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              className="absolute inset-0"
              onLoad={handleImageLoad}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {renderMedia()}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-screen-lg p-0 bg-background/95 backdrop-blur">
          {renderMedia(true)}
        </DialogContent>
      </Dialog>
    </>
  )
}

