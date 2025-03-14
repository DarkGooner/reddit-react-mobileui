"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/post-card"
import type { Post } from "@/types/reddit"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostFeedProps {
  posts: Post[] | { posts: Post[]; after: string | null; before: string | null }
  loading: boolean
  endpoint?: string
  params?: Record<string, string>
  showNSFW?: boolean
}

export default function PostFeed({
  posts: initialPosts,
  loading: initialLoading,
  endpoint,
  params = {},
  showNSFW = false,
}: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>(Array.isArray(initialPosts) ? initialPosts : initialPosts.posts)
  const [loading, setLoading] = useState<boolean>(initialLoading)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [after, setAfter] = useState<string | null>(Array.isArray(initialPosts) ? null : initialPosts.after)
  const [error, setError] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<number>(0)
  const [pullDistance, setPullDistance] = useState<number>(0)
  const { data: session } = useSession()
  const { toast } = useToast()

  useEffect(() => {
    setPosts(Array.isArray(initialPosts) ? initialPosts : initialPosts.posts)
    setLoading(initialLoading)
    setAfter(Array.isArray(initialPosts) ? null : initialPosts.after)
  }, [initialPosts, initialLoading])

  const refreshPosts = async () => {
    if (!endpoint || refreshing) return

    setRefreshing(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams(params)
      const response = await fetch(`${endpoint}?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to refresh posts")
      }

      const data = await response.json()
      setPosts(data.posts)
      setAfter(data.after)

      toast({
        title: "Refreshed",
        description: "Feed updated with latest posts",
        variant: "default",
      })
    } catch (error) {
      console.error("Error refreshing posts:", error)
      setError("Failed to refresh posts. Pull down to try again.")
      toast({
        title: "Error",
        description: "Failed to refresh posts. Pull down to try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
      setPullDistance(0)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing) return

    const touchY = e.touches[0].clientY
    const distance = touchY - touchStart

    // Only allow pull down when at top of scroll
    if (document.documentElement.scrollTop === 0 && distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 150))
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 100) {
      refreshPosts()
    }
    setPullDistance(0)
  }

  const loadMorePosts = async () => {
    if (!endpoint || !after || loadingMore) return

    setLoadingMore(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        ...params,
        after,
      })

      const response = await fetch(`${endpoint}?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to load more posts")
      }

      const data = await response.json()

      setPosts((prev) => [...prev, ...data.posts])
      setAfter(data.after)
    } catch (error) {
      console.error("Error loading more posts:", error)
      setError("Failed to load more posts. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load more posts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const handleVote = async (postId: string, direction: number) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to vote on posts",
        variant: "default",
      })
      return
    }

    try {
      const response = await fetch("/api/reddit/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: postId,
          dir: direction,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to vote")
      }
    } catch (error) {
      console.error("Error voting:", error)
      toast({
        title: "Error",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async (postId: string, saved: boolean) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save posts",
        variant: "default",
      })
      return
    }

    try {
      const response = await fetch("/api/reddit/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: postId,
          saved,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save post")
      }
    } catch (error) {
      console.error("Error saving post:", error)
      toast({
        title: "Error",
        description: `Failed to ${saved ? "save" : "unsave"} post. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const handleHide = async (postId: string, hidden: boolean) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to hide posts",
        variant: "default",
      })
      return
    }

    try {
      const response = await fetch("/api/reddit/hide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: postId,
          hidden,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to hide post")
      }
    } catch (error) {
      console.error("Error hiding post:", error)
      toast({
        title: "Error",
        description: `Failed to ${hidden ? "hide" : "unhide"} post. Please try again.`,
        variant: "destructive",
      })
    }
  }

  // Filter out NSFW posts if showNSFW is false
  const filteredPosts = showNSFW ? posts : posts.filter((post) => !post.over_18)

  return (
    <div
      className="min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-transform"
          style={{
            height: `${pullDistance}px`,
            transform: refreshing ? "scale(0.8)" : "scale(1)",
          }}
        >
          <Loader2
            className={cn(
              "h-6 w-6 text-muted-foreground transition-all",
              refreshing && "animate-spin",
              pullDistance > 100 && "text-primary scale-110",
            )}
          />
        </div>
      )}

      <div className="space-y-4 px-2 sm:px-4 py-2 content-wrapper">
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-3 animate-pulse">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-[200px] w-full rounded-md" />
                <div className="flex justify-between">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            ))}
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="flex items-center justify-center h-[50vh] p-4">
            <p className="text-muted-foreground text-center">
              {showNSFW ? "No posts found" : "No posts found. Enable NSFW content in settings to view hidden posts."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="transform transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg"
                  style={{
                    opacity: 0,
                    animation: `fadeIn 0.3s ease-out ${index * 0.1}s forwards`,
                  }}
                >
                  <PostCard post={post} onVote={handleVote} onSave={handleSave} onHide={handleHide} />
                </div>
              ))}
            </div>

            {after && (
              <div className="flex justify-center py-6">
                <Button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full sm:w-auto transition-all duration-200 hover:shadow-md"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loadingMore ? "Loading more posts..." : "Load More"}
                </Button>
              </div>
            )}

            {error && (
              <div className="text-center text-sm text-destructive p-3 rounded bg-destructive/5 transition-all duration-200">
                {error}
              </div>
            )}
          </>
        )}
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

