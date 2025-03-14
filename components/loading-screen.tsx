import { Loader2 } from "lucide-react"

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingScreen({ message = "Loading...", fullScreen = true }: LoadingScreenProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-[200px]"}`}>
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-primary"></div>
        </div>
      </div>
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  )
}

