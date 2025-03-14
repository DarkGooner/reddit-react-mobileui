"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, Info, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useNSFW } from "@/components/nsfw-context"
import { getDirectMediaUrl } from "@/lib/media-utils"
import { useRouter } from "next/navigation"
import { useInView } from "react-intersection-observer"

interface MediaPlayerProps {
  url: string
  type:
    | "video"
    | "image"
    | "audio"
    | "embed"
    | "gif"
    | "redgif"
    | "gfycat"
    | "streamable"
    | "imgur"
    | "imgur-gifv"
    | "imgur-album"
    | "vreddit"
    | "twitch"
    | "youtube"
    | "iredd-image"
  nsfw?: boolean
  width?: number
  height?: number
  poster?: string
  title?: string
  artist?: string
  onHide?: () => void
}

export default function MediaPlayer({
  url,
  type,
  nsfw = false,
  width,
  height,
  poster,
  title,
  artist,
  onHide,
}: MediaPlayerProps) {
  // Get global NSFW setting
  const { showNSFW } = useNSFW()
  const router = useRouter()

  // Clean and normalize URL
  const cleanUrl = url?.startsWith("//") ? `https:${url}` : url

  // Primary states
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [revealed, setRevealed] = useState(!nsfw || showNSFW)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // UI states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Media states - using useRef for values that don't need to trigger re-renders
  const progressRef = useRef<number>(0)
  const currentTimeRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  const volumeRef = useRef<number>(100)
  const pausedTimeRef = useRef<number>(0)
  const loadAttemptsRef = useRef<number>(0)

  // Media values that do need to trigger re-renders (for UI display)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)

  // Third-party embed states
  const [embedIframe, setEmbedIframe] = useState<string | null>(null)
  const [embedLoaded, setEmbedLoaded] = useState(false)
  const [embedType, setEmbedType] = useState<string>(type)
  const [mediaInfo, setMediaInfo] = useState<string | null>(null)
  const [directUrl, setDirectUrl] = useState<string | null>(null)

  // Refs
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isUnmountedRef = useRef(false)
  const gifAudioRef = useRef<HTMLAudioElement | null>(null)
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
  })

  // Update revealed state when global NSFW setting changes
  useEffect(() => {
    setRevealed(!nsfw || showNSFW)
  }, [nsfw, showNSFW])

  // Fetch direct media URL for third-party content
  useEffect(() => {
    const fetchDirectUrl = async () => {
      if (!cleanUrl) return

      try {
        const { directUrl: url, type: mediaType } = await getDirectMediaUrl(cleanUrl)
        setDirectUrl(url)
        if (mediaType !== "unknown") {
          setEmbedType(mediaType)
        }
      } catch (error) {
        console.error("Error fetching direct media URL:", error)
      }
    }

    fetchDirectUrl()
  }, [cleanUrl])

  // Detect media type from URL
  useEffect(() => {
    if (!cleanUrl) return

    // Determine the type of media based on URL patterns
    const detectMediaType = () => {
      // Redgifs
      if (/redgifs\.com/i.test(cleanUrl)) {
        setEmbedType("redgif")
        return
      }

      // Gfycat
      if (/gfycat\.com/i.test(cleanUrl)) {
        setEmbedType("gfycat")
        return
      }

      // Streamable
      if (/streamable\.com/i.test(cleanUrl)) {
        setEmbedType("streamable")
        return
      }

      // Imgur
      if (/imgur\.com/i.test(cleanUrl)) {
        if (/\.gifv$/i.test(cleanUrl)) {
          setEmbedType("imgur-gifv")
        } else if (/\.gif$/i.test(cleanUrl)) {
          setEmbedType("gif")
        } else if (/\/a\//i.test(cleanUrl) || /\/gallery\//i.test(cleanUrl)) {
          setEmbedType("imgur-album")
        } else {
          setEmbedType("imgur")
        }
        return
      }

      // Reddit hosted content
      if (/i\.redd\.it/i.test(cleanUrl)) {
        if (/\.gif$/i.test(cleanUrl)) {
          setEmbedType("gif")
        } else {
          setEmbedType("iredd-image")
        }
        setMediaInfo("Reddit-hosted image")
        return
      }

      if (/v\.redd\.it/i.test(cleanUrl)) {
        setEmbedType("vreddit")
        setMediaInfo("Reddit-hosted video")
        return
      }

      // Twitch clips
      if (/twitch\.tv/i.test(cleanUrl) || /clips\.twitch\.tv/i.test(cleanUrl)) {
        setEmbedType("twitch")
        setMediaInfo("Twitch clip")
        return
      }

      // YouTube
      if (/youtube\.com/i.test(cleanUrl) || /youtu\.be/i.test(cleanUrl)) {
        setEmbedType("youtube")
        setMediaInfo("YouTube video")
        return
      }

      // Direct media files
      if (/\.(mp4|webm|ogg)$/i.test(cleanUrl)) {
        setEmbedType("video")
      } else if (/\.(gif)$/i.test(cleanUrl)) {
        setEmbedType("gif")
      } else if (/\.(jpg|jpeg|png|webp)$/i.test(cleanUrl)) {
        setEmbedType("image")
      } else if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(cleanUrl)) {
        setEmbedType("audio")
      } else {
        // Use the type passed in props as fallback
        setEmbedType(type)
      }
    }

    detectMediaType()
  }, [cleanUrl, type])

  // Memoized handlers
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }, [])

  const togglePlay = useCallback(() => {
    const media = mediaRef.current
    if (!media) return

    if (playing) {
      media.pause()
      setPlaying(false)

      // Also pause any GIF audio if it exists
      if (gifAudioRef.current) {
        gifAudioRef.current.pause()
      }
    } else {
      // If we have a saved pause time, resume from the correct time
      media.currentTime = pausedTimeRef.current || 0
      media.play().catch((error) => {
        console.error("Playback failed:", error)
        setError("Playback failed: " + error.message)
        setPlaying(false)
        setIsLoading(false)
      })
      setPlaying(true)

      // Also play GIF audio if it exists
      if (gifAudioRef.current) {
        gifAudioRef.current.play().catch((err) => console.error("Failed to play GIF audio:", err))
      }
    }
  }, [playing])

  const toggleMute = useCallback(() => {
    const media = mediaRef.current
    if (!media) return

    const newMutedState = !muted
    media.muted = newMutedState
    setMuted(newMutedState)

    // Also mute/unmute GIF audio if it exists
    if (gifAudioRef.current) {
      gifAudioRef.current.muted = newMutedState
    }
  }, [muted])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }, [])

  const openExternalLink = useCallback(() => {
    window.open(cleanUrl, "_blank", "noopener,noreferrer")
  }, [cleanUrl])

  const revealContent = useCallback(() => {
    setRevealed(true)
  }, [])

  const goToHome = useCallback(() => {
    router.push("/")
  }, [router])

  const handleHide = useCallback(() => {
    if (onHide) onHide()
  }, [onHide])

  const retryLoading = useCallback(() => {
    setIsRetrying(true)
    setError(null)
    setIsLoading(true)
    loadAttemptsRef.current = 0

    // For videos and audio, we need to reload the element
    if (mediaRef.current) {
      if (mediaRef.current instanceof HTMLVideoElement || mediaRef.current instanceof HTMLAudioElement) {
        // Try using a different crossOrigin setting
        if (mediaRef.current.crossOrigin === "anonymous") {
          mediaRef.current.crossOrigin = "use-credentials"
        } else {
          mediaRef.current.crossOrigin = "anonymous"
        }

        // Reset the src to trigger a reload
        mediaRef.current.src = directUrl || cleanUrl
        mediaRef.current.load()
      }
    }

    // For third-party embeds, retry fetching
    if (
      embedType &&
      [
        "redgif",
        "gfycat",
        "streamable",
        "imgur",
        "imgur-gifv",
        "imgur-album",
        "vreddit",
        "twitch",
        "youtube",
        "iredd-image",
      ].includes(embedType)
    ) {
      fetchEmbed()
    }

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!isUnmountedRef.current && isLoading) {
        setIsLoading(false)
        setError("Loading timed out. Please try again later.")
      }
    }, 15000)

    setIsRetrying(false)

    return () => clearTimeout(timeoutId)
  }, [cleanUrl, directUrl, isLoading, embedType])

  const handleProgressChange = useCallback(
    (value: number[]) => {
      const media = mediaRef.current
      if (!media || !durationRef.current) return

      const newTime = (value[0] / 100) * durationRef.current
      media.currentTime = newTime
      currentTimeRef.current = newTime
      pausedTimeRef.current = newTime
      setProgress(value[0])
      progressRef.current = value[0]
      setCurrentTime(newTime)

      // Sync GIF audio if it exists
      if (gifAudioRef.current && embedType === "gif") {
        gifAudioRef.current.currentTime = newTime
      }
    },
    [embedType],
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const media = mediaRef.current
      if (!media) return

      const newVolume = value[0]
      media.volume = newVolume / 100
      volumeRef.current = newVolume
      setVolume(newVolume)

      // Also adjust GIF audio volume if it exists
      if (gifAudioRef.current) {
        gifAudioRef.current.volume = newVolume / 100
      }

      if (newVolume === 0) {
        setMuted(true)
        media.muted = true
        if (gifAudioRef.current) gifAudioRef.current.muted = true
      } else if (muted) {
        setMuted(false)
        media.muted = false
        if (gifAudioRef.current) gifAudioRef.current.muted = false
      }
    },
    [muted],
  )

  // Fetch and process third-party embeds
  const fetchEmbed = useCallback(async () => {
    if (!embedType || !cleanUrl) return

    setIsLoading(true)
    try {
      let embedHtml = ""
      const urlToUse = directUrl || cleanUrl

      // Handle different embed types
      switch (embedType) {
        case "redgif":
          // Extract the ID from the URL
          let redgifId = ""
          if (urlToUse.includes("redgifs.com")) {
            redgifId = urlToUse.split("/").pop() || ""
            // Handle watch/ URLs
            if (redgifId.includes("?")) {
              redgifId = redgifId.split("?")[0]
            }
          }

          if (!redgifId) {
            throw new Error("Invalid Redgif URL")
          }

          embedHtml = `
            <div class="redgif-container">
              <iframe src="https://redgifs.com/ifr/${redgifId}" frameborder="0" scrolling="no" width="100%" height="100%" allowfullscreen></iframe>
            </div>
          `
          break

        case "gfycat":
          let gfycatId = ""
          if (urlToUse.includes("gfycat.com")) {
            gfycatId = urlToUse.split("/").pop() || ""
            // Handle watch/ URLs
            if (gfycatId.includes("?")) {
              gfycatId = gfycatId.split("?")[0]
            }
          }

          if (!gfycatId) {
            throw new Error("Invalid Gfycat URL")
          }

          embedHtml = `
            <div class="redgif-container">
              <iframe src="https://gfycat.com/ifr/${gfycatId}" frameborder="0" scrolling="no" width="100%" height="100%" allowfullscreen></iframe>
            </div>
          `
          break

        case "streamable":
          let streamableId = ""
          if (urlToUse.includes("streamable.com")) {
            streamableId = urlToUse.split("/").pop() || ""
          }

          if (!streamableId) {
            throw new Error("Invalid Streamable URL")
          }

          embedHtml = `
            <div class="redgif-container">
              <iframe src="https://streamable.com/e/${streamableId}" frameborder="0" scrolling="no" width="100%" height="100%" allowfullscreen></iframe>
            </div>
          `
          break

        case "imgur-gifv":
          // Convert .gifv to .mp4 for direct playback
          const mp4Url = urlToUse.replace(".gifv", ".mp4")
          embedHtml = `<video src="${mp4Url}" controls loop muted autoplay playsinline width="100%" height="100%" class="reddit-media"></video>`
          break

        case "imgur-album":
          // For albums, we'll just link out
          embedHtml = `<div class="flex items-center justify-center h-full bg-black/10 p-4 text-center">
            <div>
              <p class="mb-2">This is an Imgur album that can't be embedded directly.</p>
              <button class="bg-primary text-primary-foreground px-4 py-2 rounded" onclick="window.open('${urlToUse}', '_blank')">
                View on Imgur
              </button>
            </div>
          </div>`
          break

        case "imgur":
          // Try to get direct image URL if it's not already
          if (!urlToUse.match(/\.(jpg|jpeg|png|gif)$/i)) {
            // Add .jpg as a fallback
            embedHtml = `<img src="${urlToUse}.jpg" alt="Imgur image" class="iredd-image" />`
          } else {
            embedHtml = `<img src="${urlToUse}" alt="Imgur image" class="iredd-image" />`
          }
          break

        case "vreddit":
          // v.redd.it URLs are tricky because they often need DASH manifests
          // For simplicity, we'll use a direct video tag and hope it works
          embedHtml = `<video src="${urlToUse}" controls playsinline width="100%" height="100%" class="vreddit-video"></video>`
          break

        case "iredd-image":
          embedHtml = `<img src="${urlToUse}" alt="Reddit image" class="iredd-image" />`
          break

        case "twitch":
          // Extract clip ID from URL
          let twitchId = ""
          if (urlToUse.includes("clips.twitch.tv")) {
            twitchId = urlToUse.split("/").pop() || ""
          } else if (urlToUse.includes("twitch.tv/")) {
            const parts = urlToUse.split("/")
            const clipIndex = parts.indexOf("clip") + 1
            if (clipIndex > 0 && clipIndex < parts.length) {
              twitchId = parts[clipIndex]
            }
          }

          if (!twitchId) {
            throw new Error("Invalid Twitch clip URL")
          }

          embedHtml = `
            <div class="redgif-container">
              <iframe src="https://clips.twitch.tv/embed?clip=${twitchId}&parent=${window.location.hostname}" frameborder="0" allowfullscreen="true" scrolling="no" width="100%" height="100%"></iframe>
            </div>
          `
          break

        case "youtube":
          // Extract video ID from URL
          let youtubeId = ""
          if (urlToUse.includes("youtube.com/watch?v=")) {
            youtubeId = new URL(urlToUse).searchParams.get("v") || ""
          } else if (urlToUse.includes("youtu.be/")) {
            youtubeId = urlToUse.split("youtu.be/")[1].split("?")[0]
          }

          if (!youtubeId) {
            throw new Error("Invalid YouTube URL")
          }

          embedHtml = `
            <div class="redgif-container">
              <iframe src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen width="100%" height="100%"></iframe>
            </div>
          `
          break
      }

      setEmbedIframe(embedHtml)
      setEmbedLoaded(true)
      setIsLoading(false)
    } catch (error) {
      console.error(`Error loading ${embedType} content:`, error)
      setError(`Failed to load ${embedType} content. ${error instanceof Error ? error.message : ""}`)
      setIsLoading(false)
    }
  }, [cleanUrl, directUrl, embedType])

  // Effect for handling GIFs with audio
  useEffect(() => {
    // Only apply this for GIFs that might have audio
    if (embedType !== "gif" || !cleanUrl) return

    // Check if there's an associated audio file
    // This is a common pattern in Reddit where GIFs have separate audio files
    const checkForAudio = async () => {
      // Common patterns for audio files associated with GIFs
      const possibleAudioUrls = [
        cleanUrl.replace(/\.gif$/i, ".mp3"),
        cleanUrl.replace(/\.gif$/i, ".m4a"),
        cleanUrl.replace(/\.gif$/i, ".wav"),
        cleanUrl.replace(/\.gif$/i, ".ogg"),
        // Add more patterns if needed
      ]

      // Create an audio element to test
      const audio = new Audio()
      audio.crossOrigin = "anonymous"
      audio.muted = muted
      audio.volume = volumeRef.current / 100

      // Try each possible audio URL
      for (const audioUrl of possibleAudioUrls) {
        try {
          audio.src = audioUrl

          // Create a promise that resolves when the audio can play
          const canPlay = new Promise((resolve, reject) => {
            audio.oncanplay = resolve
            audio.onerror = reject

            // Set a timeout to avoid hanging
            setTimeout(reject, 3000)
          })

          await canPlay

          // If we get here, the audio can play
          gifAudioRef.current = audio

          // Set up event listeners
          audio.onended = () => {
            // Loop the audio if the GIF is looping
            audio.currentTime = 0
            if (playing) audio.play().catch((err) => console.error("Failed to loop GIF audio:", err))
          }

          if (playing) {
            audio.play().catch((err) => console.error("Failed to play GIF audio:", err))
          }

          break
        } catch (error) {
          // This audio URL didn't work, try the next one
          console.log(`Audio not found at ${audioUrl}`)
        }
      }
    }

    checkForAudio()

    return () => {
      // Clean up audio element
      if (gifAudioRef.current) {
        gifAudioRef.current.pause()
        gifAudioRef.current.src = ""
        gifAudioRef.current = null
      }
    }
  }, [cleanUrl, embedType, muted, playing])

  // Effect for clean-up on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true

      // Clean up media if needed
      if (mediaRef.current) {
        mediaRef.current.pause()
        mediaRef.current.src = ""
        mediaRef.current.load()
      }

      // Clean up GIF audio if needed
      if (gifAudioRef.current) {
        gifAudioRef.current.pause()
        gifAudioRef.current.src = ""
      }
    }
  }, [])

  // Handle third-party embeds
  useEffect(() => {
    if (
      embedType &&
      [
        "redgif",
        "gfycat",
        "streamable",
        "imgur",
        "imgur-gifv",
        "imgur-album",
        "vreddit",
        "twitch",
        "youtube",
        "iredd-image",
      ].includes(embedType)
    ) {
      fetchEmbed()
    }
  }, [embedType, fetchEmbed, directUrl])

  // Handle direct image loading
  useEffect(() => {
    if (embedType === "image") {
      const img = new Image()
      let unmounted = false

      img.crossOrigin = "anonymous"

      img.onload = () => {
        if (!unmounted) {
          setIsLoading(false)
          setError(null)
        }
      }

      img.onerror = () => {
        if (!unmounted) {
          console.error(`Failed to load image: ${directUrl || cleanUrl}`)
          setIsLoading(false)
          setError("Failed to load image. The image might be unavailable or in an unsupported format.")
        }
      }

      img.src = directUrl || cleanUrl

      return () => {
        unmounted = true
        img.src = ""
      }
    }
  }, [cleanUrl, directUrl, embedType])

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Video and audio setup and event handlers
  useEffect(() => {
    const media = mediaRef.current
    if (!media || (embedType !== "video" && embedType !== "audio")) return

    const handleLoadStart = () => {
      if (!isUnmountedRef.current) {
        setIsLoading(true)
      }
    }

    const handleLoadedData = () => {
      if (!isUnmountedRef.current) {
        setIsLoading(false)
        setError(null)
      }
    }

    const handleError = (e: Event) => {
      console.error("Media loading error:", e)

      if (isUnmountedRef.current) return

      setIsLoading(false)

      // Try alternative approach if direct loading fails
      if (loadAttemptsRef.current < 1) {
        loadAttemptsRef.current += 1
        console.log("Attempting alternative loading approach...")

        // Try with a different crossOrigin setting
        if (media instanceof HTMLVideoElement || media instanceof HTMLAudioElement) {
          if (media.crossOrigin === "anonymous") {
            media.crossOrigin = "use-credentials"
          } else {
            media.crossOrigin = "anonymous"
          }

          // Try a different media loading approach (instead of using CORS proxy)
          try {
            // Force reload with current settings
            media.load()
          } catch (reloadError) {
            console.error("Reload attempt failed:", reloadError)
            setError(`Failed to load ${embedType} content. The media might be unavailable or in an unsupported format.`)
          }
        }
      } else {
        setError(`Failed to load ${embedType} content. The media might be unavailable or in an unsupported format.`)
      }
    }

    const updateProgress = () => {
      if (isUnmountedRef.current) return

      if (media.duration) {
        const newProgress = (media.currentTime / media.duration) * 100
        progressRef.current = newProgress
        currentTimeRef.current = media.currentTime

        // Only update state if the change is significant enough to warrant a re-render
        // This reduces unnecessary re-renders during playback
        if (Math.abs(newProgress - progress) > 0.5 || Math.abs(media.currentTime - currentTime) > 0.5) {
          setProgress(newProgress)
          setCurrentTime(media.currentTime)
        }
      }
    }

    const handleLoadedMetadata = () => {
      if (isUnmountedRef.current) return

      durationRef.current = media.duration
      setDuration(media.duration)
      setIsLoading(false)
    }

    const handleEnded = () => {
      if (isUnmountedRef.current) return

      setPlaying(false)
      progressRef.current = 0
      currentTimeRef.current = 0
      pausedTimeRef.current = 0
      setProgress(0)
      setCurrentTime(0)
      media.currentTime = 0
    }

    const handlePause = () => {
      pausedTimeRef.current = media.currentTime
    }

    const handlePlay = () => {
      if (isUnmountedRef.current) return
      setPlaying(true)
    }

    // Set CORS mode - try anonymous first
    media.crossOrigin = "anonymous"

    // Add event listeners
    media.addEventListener("loadstart", handleLoadStart)
    media.addEventListener("loadeddata", handleLoadedData)
    media.addEventListener("error", handleError)
    media.addEventListener("timeupdate", updateProgress)
    media.addEventListener("loadedmetadata", handleLoadedMetadata)
    media.addEventListener("ended", handleEnded)
    media.addEventListener("pause", handlePause)
    media.addEventListener("play", handlePlay)

    // Set src and load
    if (embedType === "video") {
      ;(media as HTMLVideoElement).src = directUrl || cleanUrl
      if (poster) {
        ;(media as HTMLVideoElement).poster = poster
      }
    } else if (embedType === "audio") {
      ;(media as HTMLAudioElement).src = directUrl || cleanUrl
    }

    return () => {
      // Remove all event listeners
      media.removeEventListener("loadstart", handleLoadStart)
      media.removeEventListener("loadeddata", handleLoadedData)
      media.removeEventListener("error", handleError)
      media.removeEventListener("timeupdate", updateProgress)
      media.removeEventListener("loadedmetadata", handleLoadedMetadata)
      media.removeEventListener("ended", handleEnded)
      media.removeEventListener("pause", handlePause)
      media.removeEventListener("play", handlePlay)

      // Clean up media
      media.pause()
    }
  }, [cleanUrl, directUrl, embedType, poster, progress, currentTime])

  // Pause when out of view
  useEffect(() => {
    if (!inView && playing) {
      setPlaying(false)
      mediaRef.current?.pause()
    }
  }, [inView, playing])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!mediaRef.current) return

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault()
          togglePlay()
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "arrowleft":
          e.preventDefault()
          mediaRef.current.currentTime -= 5
          break
        case "arrowright":
          e.preventDefault()
          mediaRef.current.currentTime += 5
          break
        case "arrowup":
          e.preventDefault()
          setVolume(Math.min(volume + 0.1, 1))
          break
        case "arrowdown":
          e.preventDefault()
          setVolume(Math.max(volume - 0.1, 0))
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [volume])

  // Action buttons that appear on all media types
  const ActionButtons = () => (
    <div className="flex justify-end gap-2 mt-2 p-1">
      {mediaInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Info className="h-4 w-4 mr-1" />
                Info
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{mediaInfo}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Button variant="ghost" size="sm" className="h-8" onClick={openExternalLink}>
        <ExternalLink className="h-4 w-4 mr-1" />
        View Original
      </Button>

      {onHide && (
        <Button variant="ghost" size="sm" className="h-8" onClick={handleHide}>
          <EyeOff className="h-4 w-4 mr-1" />
          Hide
        </Button>
      )}
    </div>
  )

  // Render image
  const renderImage = () => {
    return (
      <div className="flex flex-col">
        <div className="relative aspect-auto max-h-[90vh] flex items-center justify-center bg-black">
          <img
            src={directUrl || cleanUrl || "/placeholder.svg"}
            alt="Post image"
            className="max-h-[90vh] max-w-full object-contain"
            loading="lazy"
            crossOrigin="anonymous"
            onError={() => !isUnmountedRef.current && setError("Failed to load image")}
          />
        </div>
        <ActionButtons />
      </div>
    )
  }

  // Render GIF
  const renderGif = () => {
    return (
      <div className="flex flex-col">
        <div className="relative aspect-auto max-h-[90vh] flex items-center justify-center bg-black">
          <img
            src={directUrl || cleanUrl || "/placeholder.svg"}
            alt="GIF content"
            className="max-h-[90vh] max-w-full object-contain"
            loading="lazy"
            crossOrigin="anonymous"
            onError={() => !isUnmountedRef.current && setError("Failed to load GIF")}
          />
          {/* GIF controls for audio if available */}
          {gifAudioRef.current && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8" onClick={togglePlay}>
                  {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {playing ? "Pause" : "Play"}
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={toggleMute}>
                  {muted ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
                  {muted ? "Unmute" : "Mute"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <ActionButtons />
      </div>
    )
  }

  // Render third-party embed
  const renderEmbed = () => {
    return (
      <div className="flex flex-col">
        <div className="relative aspect-video bg-black">
          {embedLoaded ? (
            <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: embedIframe || "" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse">Loading...</div>
            </div>
          )}
        </div>
        <ActionButtons />
      </div>
    )
  }

  // NSFW content blur
  if (!revealed) {
    return (
      <div className="relative bg-muted/20 rounded-md overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-xl bg-background/50 z-10 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-sm font-medium mb-2">NSFW Content</p>
            <Button onClick={revealContent} variant="secondary" size="sm">
              Reveal Content
            </Button>
          </div>
        </div>
        {/* Show blurred preview */}
        <div className="opacity-30 filter blur-md">
          {embedType === "image" ||
            (embedType === "iredd-image" && (
              <img
                src={directUrl || cleanUrl || "/placeholder.svg"}
                alt="Blurred preview"
                className="max-h-[90vh] w-full object-contain"
              />
            ))}
          {(embedType === "video" || embedType === "vreddit") && <div className="aspect-video bg-black"></div>}
          {embedType === "audio" && <div className="h-24 bg-card/50 rounded-md border"></div>}
          {(embedType === "redgif" ||
            embedType === "gfycat" ||
            embedType === "streamable" ||
            embedType === "twitch" ||
            embedType === "youtube") && <div className="aspect-video bg-black"></div>}
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="relative bg-muted/20 rounded-md aspect-video flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading media...</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-full truncate px-4">{directUrl || cleanUrl}</p>
        </div>
      </div>
    )
  }

  // Modify the MediaPlayer component to handle failed media better and remove overlaid buttons
  // Update the error state to show only an external link
  const renderError = () => {
    return (
      <div className="relative bg-muted/20 rounded-md aspect-video flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-sm font-medium mb-2 text-destructive">Media could not be loaded</p>
          <div className="text-xs text-muted-foreground mb-3 max-w-full px-4 truncate">
            URL: {directUrl || cleanUrl}
          </div>
          <Button onClick={openExternalLink} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Original
          </Button>
        </div>
      </div>
    )
  }

  // Update the error handling to show only an external link
  if (error) {
    return renderError()
  }

  // Image rendering
  if (embedType === "image" || embedType === "iredd-image") {
    return renderImage()
  }

  // GIF rendering
  if (embedType === "gif") {
    return renderGif()
  }

  // Third-party embed rendering
  if (
    ["redgif", "gfycat", "streamable", "imgur", "imgur-gifv", "imgur-album", "vreddit", "twitch", "youtube"].includes(
      embedType || "",
    )
  ) {
    return renderEmbed()
  }

  // Video rendering
  if (embedType === "video") {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative aspect-video bg-black group media-container",
          isFullscreen && "fixed inset-0 z-50 flex items-center justify-center",
        )}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onTouchStart={() => setShowControls(true)}
        onTouchEnd={() => setTimeout(() => setShowControls(false), 3000)}
      >
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          className="w-full h-full max-h-[90vh] object-contain"
          muted={muted}
          playsInline
          onClick={togglePlay}
          loop={false}
          poster={poster}
          controls={false}
          preload="metadata"
        />
        <div
          className={cn(
            "media-controls",
            showControls || playing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white rounded-full" onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="relative flex items-center group">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white rounded-full"
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              {showVolumeSlider && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/80 rounded-md w-24 transition-opacity">
                  <Slider
                    value={[muted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="h-1"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-white">{formatTime(currentTime)}</span>
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={handleProgressChange}
                className="flex-1 h-1"
              />
              <span className="text-xs text-white">{formatTime(duration)}</span>
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-white rounded-full" onClick={toggleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ActionButtons />
      </div>
    )
  }

  // Audio rendering
  if (embedType === "audio") {
    return (
      <div className="p-3 bg-card/50 rounded-md border">
        <div className="mb-2">
          <h4 className="text-sm font-medium">{title || "Audio"}</h4>
          {artist && <p className="text-xs text-muted-foreground">{artist}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={togglePlay}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs">{formatTime(currentTime)}</span>
            <Slider value={[progress]} max={100} step={0.1} onValueChange={handleProgressChange} className="flex-1" />
            <span className="text-xs">{formatTime(duration)}</span>
          </div>

          <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleMute}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" className="rounded-full" onClick={openExternalLink}>
            <ExternalLink className="h-4 w-4" />
          </Button>

          {onHide && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleHide}>
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </div>
        <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} muted={muted} preload="metadata" />
      </div>
    )
  }

  return null
}

