"use client"

import { useState } from "react"
import { ArrowBigUp, ArrowBigDown, MessageSquare, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { vote, submitComment } from "@/lib/reddit-api"
import { toast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface CommentProps {
  id: string
  author: string
  body: string
  body_html: string
  score: number
  created_utc: number
  depth: number
  replies?: CommentProps[]
  is_submitter: boolean
  distinguished?: string | null
  stickied?: boolean
  collapsed?: boolean
  score_hidden?: boolean
  onReply?: (commentId: string, text: string) => void
  onVote?: (commentId: string, direction: -1 | 0 | 1) => void
  className?: string
}

export default function Comment({
  id,
  author,
  body,
  body_html,
  score,
  created_utc,
  depth,
  replies,
  is_submitter,
  distinguished,
  stickied,
  collapsed: initialCollapsed,
  score_hidden,
  onReply,
  onVote,
  className,
}: CommentProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteState, setVoteState] = useState<-1 | 0 | 1>(0)
  const [currentScore, setCurrentScore] = useState(score)
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (direction: -1 | 0 | 1) => {
    if (isVoting) return

    setIsVoting(true)
    try {
      const newDirection = voteState === direction ? 0 : direction
      await vote(id, newDirection)

      setVoteState(newDirection)
      setCurrentScore(score + newDirection - voteState)
      onVote?.(id, newDirection)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVoting(false)
    }
  }

  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await submitComment(id, replyText)
      setReplyText("")
      setIsReplying(false)
      onReply?.(id, replyText)
      toast({
        title: "Success",
        description: "Your reply has been posted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatScore = (score: number) => {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`
    }
    return score.toString()
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn("pl-4 border-l-2", depth > 0 ? "border-border" : "border-transparent")}>
        {/* Comment Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            className="hover:underline font-medium text-foreground"
            onClick={() => window.open(`https://reddit.com/user/${author}`, "_blank")}
          >
            {author}
          </button>
          {is_submitter && <span className="px-1 py-0.5 text-xs bg-blue-500 text-white rounded">OP</span>}
          {distinguished === "moderator" && (
            <span className="px-1 py-0.5 text-xs bg-green-500 text-white rounded">MOD</span>
          )}
          {distinguished === "admin" && (
            <span className="px-1 py-0.5 text-xs bg-red-500 text-white rounded">ADMIN</span>
          )}
          <span>•</span>
          <span>{formatDistanceToNow(created_utc * 1000)} ago</span>
          {stickied && (
            <>
              <span>•</span>
              <span className="text-green-500">Stickied comment</span>
            </>
          )}
        </div>

        {/* Comment Body */}
        {!isCollapsed && (
          <div
            className="mt-1 text-sm prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: body_html }}
          />
        )}

        {/* Comment Actions */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6", voteState === 1 ? "text-orange-500" : "")}
              onClick={() => handleVote(1)}
              disabled={isVoting}
            >
              <ArrowBigUp className="h-4 w-4" />
            </Button>
            <span className="min-w-[2ch] text-center text-sm font-medium">
              {score_hidden ? "•" : formatScore(currentScore)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6", voteState === -1 ? "text-blue-500" : "")}
              onClick={() => handleVote(-1)}
              disabled={isVoting}
            >
              <ArrowBigDown className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsReplying(!isReplying)}>
            <MessageSquare className="h-3 w-3 mr-1" />
            Reply
          </Button>

          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? "Expand" : "Collapse"}
          </Button>

          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Reply Form */}
        {isReplying && !isCollapsed && (
          <div className="mt-4 space-y-2">
            <Textarea
              placeholder="What are your thoughts?"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmitReply} disabled={!replyText.trim() || isSubmitting}>
                Reply
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsReplying(false)
                  setReplyText("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {!isCollapsed &&
        replies?.map((reply) => (
          <Comment key={reply.id} {...reply} depth={depth + 1} onReply={onReply} onVote={onVote} className="mt-2" />
        ))}
    </div>
  )
}

