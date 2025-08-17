"use client"
import { useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/hooks/use-translation"
import Image from "next/image"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
  type: "text" | "image" | "voice"
  imageUrl?: string
  audioUrl?: string
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  userData?: {
    [key: string]: unknown
  }
}

function FarmingLoadingIndicator() {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 max-w-[85%] mr-auto">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-secondary text-secondary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 items-start">
        <Card className="p-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-6 h-6 relative">
                <div className="absolute bottom-0 w-6 h-2 bg-amber-600 rounded-full opacity-60"></div>
                <div
                  className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-0.5 bg-green-500 animate-pulse origin-bottom"
                  style={{
                    height: "12px",
                    animation: "grow 1.5s ease-in-out infinite alternate",
                  }}
                ></div>
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                  <Leaf
                    className="h-3 w-3 text-green-400 animate-bounce"
                    style={{ animationDelay: "0.3s", animationDuration: "2s" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-1">
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0s", animationDuration: "1.4s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s", animationDuration: "1.4s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s", animationDuration: "1.4s" }}
              ></div>
            </div>

            <span className="text-sm text-muted-foreground animate-pulse">{t("analyzing")}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { language } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const formatTime = (date: Date) => {
    const dateObj = date instanceof Date ? date : new Date(date)
    const locale = getLocaleFromLanguage(language)
    return dateObj.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  }

  const getLocaleFromLanguage = (lang: string) => {
    const localeMap: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      te: "te-IN",
      ta: "ta-IN",
      gu: "gu-IN",
      ur: "ur-IN",
      kn: "kn-IN",
      or: "or-IN",
    }
    return localeMap[lang] || "en-US"
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-2",
            "max-w-[85%] sm:max-w-[80%]",
            message.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
            "break-words overflow-hidden",
          )}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback
              className={cn(
                "text-xs",
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {message.sender === "user" ? "U" : <Bot className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>

          <div className={cn("flex flex-col gap-1 min-w-0 max-w-full", message.sender === "user" ? "items-end" : "items-start")}>
            <Card
              className={cn(
                "p-3 break-words overflow-hidden",
                message.type === "voice" ? "w-fit min-w-[280px]" : "max-w-full",
                message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {message.type === "image" && message.imageUrl && (
                <Image
                  src={message.imageUrl || "/placeholder.svg"}
                  alt="Uploaded crop"
                  width={256}
                  height={256}
                  className="rounded-md max-w-full h-auto mb-2 max-h-64 object-cover"
                />
              )}

              {message.type === "voice" && message.audioUrl && (
                <audio controls className="mb-2 w-full">
                  <source src={message.audioUrl} type="audio/wav" />
                </audio>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
            </Card>

            <span className="text-xs text-muted-foreground px-1">{formatTime(message.timestamp)}</span>
          </div>
        </div>
      ))}

      {isLoading && <FarmingLoadingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  )
}
