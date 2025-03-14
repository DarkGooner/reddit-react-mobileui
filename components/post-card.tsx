"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { ArrowBigUp, ArrowBigDown, MessageSquare, ExternalLink, Bookmark, Share2, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import MediaRenderer from "@/components/media-renderer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Post } from "@/types/reddit"

interface PostCardProps {
  post: Post
  showSubreddit?: boolean
  showFullContent?: boolean
  className?: string
  onVote?: (postId: string, direction: number) => void
  onSave?: (postId: string, saved: boolean) => void
  onHide?: (postId: string, hidden: boolean) => void
}

export default function PostCard({
  post,
  showSubreddit = true,
  showFullContent = false,
  className,
  onVote,
  onSave,
  onHide,
}: PostCardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [score, setScore] = useState(post.score)
  const [userVote, setUserVote] = useState<1 | -1 | 0>(post.likes === true ? 1 : post.likes === false ? -1 : 0)
  const [saved, setSaved] = useState(post.saved || false)
  const [hidden, setHidden] = useState(post.hidden || false)
  const [mediaError, setMediaError] = useState<string | null>(null)

  // Check if post is a crosspost
  const isCrosspost = !!post.crosspost_parent_list && post.crosspost_parent_list.length > 0
  const originalSubreddit = isCrosspost ? post.crosspost_parent_list[0]?.subreddit : null
  const originalAuthor = isCrosspost ? post.crosspost_parent_list[0]?.author : null

  const handleVote = async (value: 1 | -1) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on posts",
        variant: "destructive",
      })
      return
    }

    const newValue = userVote === value ? 0 : value
    const scoreDiff = newValue - userVote

    setUserVote(newValue)
    setScore((prev) => prev + scoreDiff)

    if (onVote) {
      onVote(post.id, newValue)
    } else {
      // Fallback to direct API call if no handler provided
      try {
        const response = await fetch("/api/reddit/vote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: post.id,
            dir: newValue,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to vote")
        }

        toast({
          title: "Vote recorded",
          description: `Successfully ${newValue === 0 ? "removed vote" : newValue === 1 ? "upvoted" : "downvoted"}`,
        })
      } catch (error) {
        console.error("Error voting:", error)
        // Revert UI state on error
        setUserVote(userVote)
        setScore(score)
        toast({
          title: "Error",
          description: "Failed to vote. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save posts",
        variant: "destructive",
      })
      return
    }

    const newSavedState = !saved
    setSaved(newSavedState)

    if (onSave) {
      onSave(post.id, newSavedState)
    } else {
      // Fallback to direct API call if no handler provided
      try {
        const response = await fetch("/api/reddit/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: post.id,
            saved: newSavedState,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save post")
        }

        toast({
          title: newSavedState ? "Post saved" : "Post unsaved",
          description: `Successfully ${newSavedState ? "added to" : "removed from"} saved posts`,
        })
      } catch (error) {
        console.error("Error saving post:", error)
        // Revert UI state on error
        setSaved(saved)
        toast({
          title: "Error",
          description: "Failed to save post. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleHide = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to hide posts",
        variant: "destructive",
      })
      return
    }

    const newHiddenState = !hidden
    setHidden(newHiddenState)

    if (onHide) {
      onHide(post.id, newHiddenState)
    } else {
      // Fallback to direct API call if no handler provided
      try {
        const response = await fetch("/api/reddit/hide", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: post.id,
            hidden: newHiddenState,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to hide post")
        }

        toast({
          title: newHiddenState ? "Post hidden" : "Post unhidden",
          description: `Successfully ${newHiddenState ? "hidden" : "unhidden"} post`,
        })
      } catch (error) {
        console.error("Error hiding post:", error)
        // Revert UI state on error
        setHidden(hidden)
        toast({
          title: "Error",
          description: "Failed to hide post. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const navigateToSubreddit = (e: React.MouseEvent, subreddit: string) => {
    e.stopPropagation()
    router.push(`/r/${subreddit}`)
  }

  const handlePostClick = () => {
    router.push(`/comments/${post.id}`)
  }

  const handleShare = async () => {
    const postUrl = `https://reddit.com${post.permalink}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          url: postUrl,
        })
      } catch (err) {
        console.error("Error sharing:", err)
        copyToClipboard(postUrl)
      }
    } else {
      copyToClipboard(postUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    })
  }

  // Format score for display
  const formatScore = (score: number) => {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`
    }
    return score.toString()
  }

  const handleMediaError = (error: string) => {
    setMediaError(error)
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground overflow-hidden shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
      onClick={handlePostClick}
    >
      {/* Vote buttons */}
      <div className="flex">
        <div className="flex flex-col items-center gap-1 p-2 sm:p-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", userVote === 1 && "text-orange-500 dark:text-orange-400")}
            onClick={(e) => {
              e.stopPropagation()
              handleVote(1)
            }}
          >
            <ArrowBigUp className="h-6 w-6" />
          </Button>
          <span className="text-sm font-medium">{formatScore(score)}</span>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", userVote === -1 && "text-blue-500 dark:text-blue-400")}
            onClick={(e) => {
              e.stopPropagation()
              handleVote(-1)
            }}
          >
            <ArrowBigDown className="h-6 w-6" />
          </Button>
        </div>

        {/* Post content */}
        <div className="flex-1 p-2 sm:p-4 overflow-hidden">
          {/* Post header */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
            {showSubreddit && (
              <>
                {post.subreddit_icon && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={post.subreddit_icon} />
                    <AvatarFallback>{post.subreddit[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <button onClick={(e) => navigateToSubreddit(e, post.subreddit)} className="font-medium hover:underline">
                  r/{post.subreddit}
                </button>
                <span>•</span>
              </>
            )}
            <span>Posted by u/{post.author}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created * 1000))} ago</span>

            {/* Post flair */}
            {post.link_flair_text && (
              <Badge
                className="ml-1"
                style={{
                  backgroundColor: post.link_flair_background_color || undefined,
                  color: post.link_flair_text_color === "light" ? "white" : "black",
                }}
              >
                {post.link_flair_text}
              </Badge>
            )}
          </div>

          {/* Post title */}
          <h2 className="text-lg font-semibold mb-2">{post.title}</h2>

          {/* Crosspost indication */}
          {isCrosspost && originalSubreddit && (
            <Button
              variant="outline"
              size="sm"
              className="mb-2"
              onClick={(e) => {
                e.stopPropagation()
                navigateToSubreddit(e, originalSubreddit)
              }}
            >
              Crossposted from r/{originalSubreddit} by u/{originalAuthor}
            </Button>
          )}

          {/* Post content */}
          {showFullContent && post.selftext && (
            <div className="prose dark:prose-invert max-w-none mb-4 text-sm">{post.selftext}</div>
          )}

          {/* Media content */}
          {post.url && !post.is_self && !mediaError && (
            <div className="mb-4 overflow-hidden rounded-md">
              <MediaRenderer post={post} maxWidth={800} maxHeight={600} className="w-full" onError={handleMediaError} />
            </div>
          )}

          {/* Poll content */}
          {post.poll_data && (
            <div className="mb-4 p-3 border rounded-md">
              <h3 className="font-medium mb-2">Poll</h3>
              <div className="space-y-2">
                {post.poll_data.options.map((option: any, index: number) => (
                  <div key={index} className="flex flex-col">
                    <div className="flex justify-between text-sm">
                      <span>{option.text}</span>
                      <span>{option.vote_count || 0} votes</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full mt-1">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${
                            post.poll_data.total_vote_count
                              ? (option.vote_count / post.poll_data.total_vote_count) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {post.poll_data.total_vote_count || 0} total votes •
                {post.poll_data.voting_end_timestamp
                  ? ` Ends ${formatDistanceToNow(new Date(post.poll_data.voting_end_timestamp * 1000))}`
                  : " Voting closed"}
              </p>
            </div>
          )}

          {/* Link post preview */}
          {post.is_self === false &&
            post.domain &&
            post.domain !== "i.redd.it" &&
            post.domain !== "v.redd.it" &&
            mediaError && (
              <div className="mb-4 p-3 border rounded-md">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{post.domain}</p>
                    <p className="text-xs text-muted-foreground truncate">{post.url}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(post.url, "_blank")
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            )}

          {/* Text post preview */}
          {post.is_self && post.selftext && !showFullContent && (
            <div className="mb-4 prose dark:prose-invert max-w-none text-sm line-clamp-3">{post.selftext}</div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 text-muted-foreground overflow-x-auto pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation()
                handlePostClick()
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {new Intl.NumberFormat().format(post.num_comments)} Comments
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 whitespace-nowrap", saved && "text-yellow-500 dark:text-yellow-400")}
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {saved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation()
                handleHide()
              }}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              {hidden ? "Unhide" : "Hide"}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 whitespace-nowrap" asChild>
              <Link
                href={post.url || `https://reddit.com${post.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Original
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

