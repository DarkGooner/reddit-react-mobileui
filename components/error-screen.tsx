"use client"

import { AlertCircle, RefreshCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface ErrorScreenProps {
  message?: string
  fullScreen?: boolean
  onRetry?: () => void
}

export default function ErrorScreen({
  message = "Something went wrong",
  fullScreen = true,
  onRetry,
}: ErrorScreenProps) {
  const router = useRouter()

  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-[200px]"}`}>
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Error</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">{message}</p>

      <div className="flex gap-4">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}

        <Button variant="outline" onClick={() => router.push("/")}>
          <Home className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </div>
    </div>
  )
}

