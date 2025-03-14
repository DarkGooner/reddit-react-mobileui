"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { getPostComments, vote, submitComment, subscribeToSubreddit } from "@/lib/reddit-api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import Comment from "./comment"
import { Loader2, RefreshCw } from "lucide-react"

interface CommentsProps {
  postId: string
  subreddit: string
  isSubscribed?: boolean
  className?: string
}

export default function CommentsSection({ postId, subreddit, isSubscribed = false, className }: CommentsProps) {
  const [comments, setComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sort, setSort] = useState<"best" | "top" | "new" | "controversial" | "old">("best")
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userSubscribed, setUserSubscribed] = useState(isSubscribed)
  const { data: session } = useSession()
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchComments()
  }, [postId, sort])

  const fetchComments = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const data = await getPostComments(postId, sort)
      setComments(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleVote = async (commentId: string, direction: -1 | 0 | 1) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on comments",
        variant: "destructive",
      })
      return
    }

    // Update local state optimistically
    setComments((prevComments) => {
      const updateComment = (comments: any[]): any[] => {
        return comments.map((comment) => {
          if (comment.id === commentId) {
            const prevDirection = comment.likes === true ? 1 : comment.likes === false ? -1 : 0
            const scoreDiff = direction - prevDirection

            return {
              ...comment,
              score: comment.score + scoreDiff,
              likes: direction === 1 ? true : direction === -1 ? false : null,
            }
          }
          if (comment.replies?.length) {
            return {
              ...comment,
              replies: updateComment(comment.replies),
            }
          }
          return comment
        })
      }
      return updateComment(prevComments)
    })

    // Make API call
    try {
      await vote(commentId, direction)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
      // Could revert the optimistic update here
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      })
      return
    }

    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await submitComment(postId, newComment)
      setNewComment("")
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully",
      })
      // Refresh comments to show the new one
      fetchComments(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = async (commentId: string, text: string) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to reply to comments",
        variant: "destructive",
      })
      return
    }

    try {
      await submitComment(commentId, text)
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully",
      })
      // Refresh comments to show the new reply
      fetchComments(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubscribe = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to subreddits",
        variant: "destructive",
      })
      return
    }

    try {
      await subscribeToSubreddit(subreddit, userSubscribed ? "unsub" : "sub")
      setUserSubscribed(!userSubscribed)
      toast({
        title: userSubscribed ? "Unsubscribed" : "Subscribed",
        description: userSubscribed
          ? `You have unsubscribed from r/${subreddit}`
          : `You have subscribed to r/${subreddit}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      })
    }
  }

  const sortOptions: { label: string; value: typeof sort }[] = [
    { label: "Best", value: "best" },
    { label: "Top", value: "top" },
    { label: "New", value: "new" },
    { label: "Controversial", value: "controversial" },
    { label: "Old", value: "old" },
  ]

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {sortOptions.map((option) => (
              <Skeleton key={option.value} className="h-8 w-16" />
            ))}
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 mb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={sort === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchComments(true)} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>

          {session && (
            <Button variant={userSubscribed ? "outline" : "default"} size="sm" onClick={handleSubscribe}>
              {userSubscribed ? "Joined" : "Join"}
            </Button>
          )}
        </div>
      </div>

      {session ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <Textarea
            ref={commentInputRef}
            placeholder="What are your thoughts?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] mb-2"
          />
          <Button type="submit" disabled={!newComment.trim() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              "Comment"
            )}
          </Button>
        </form>
      ) : (
        <div className="mb-6 p-4 border rounded-md text-center">
          <p className="mb-2">Sign in to leave a comment</p>
          <Button onClick={() => (window.location.href = "/auth/signin")}>Sign In</Button>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => <Comment key={comment.id} {...comment} onVote={handleVote} onReply={handleReply} />)
        )}
      </div>
    </div>
  )
}

