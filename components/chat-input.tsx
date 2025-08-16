"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Send, ImageIcon } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onImageUpload: (file: File) => void
  onVoiceMessage: (audioBlob: Blob) => void
  suggestedQueries: string[]
  onSuggestedQueryClick: (query: string) => void
  userData?: {
    mainCrops?: string
    name?: string
    location?: string
    language?: string
    farmType?: string
    experience?: string
    farmSize?: string
    goals?: string
    email?: string
    phone?: string
    avatar?: string
    joinDate?: string
    totalChats?: number
    diseasesIdentified?: number
    achievements?: string[]
  }
}

export function ChatInput({
  onSendMessage,
  onImageUpload,
  onVoiceMessage,
  suggestedQueries,
  onSuggestedQueryClick,
  userData,
}: ChatInputProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue)
    setInputValue("")
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImageUpload(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const audioChunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" })
        onVoiceMessage(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)

      setRecordingTime(0)
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      setRecordingInterval(interval)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)

      if (recordingInterval) {
        clearInterval(recordingInterval)
        setRecordingInterval(null)
      }
      setRecordingTime(0)
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getPlaceholderText = () => {
    if (userData?.mainCrops) {
      return t("askAboutSpecificCrops", { crops: userData.mainCrops })
    }
    return t("askAboutCrops")
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-4xl mx-auto">
      <div className="mb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {suggestedQueries.map((query, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSuggestedQueryClick(query)}
              className="whitespace-nowrap text-xs px-3 py-1 h-auto min-w-fit flex-shrink-0 bg-muted/50 hover:bg-emerald-600 hover:text-white border-muted-foreground/20 hover:border-emerald-600 transition-colors"
            >
              {query}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 h-10 w-10 bg-emerald-100 hover:bg-emerald-200 border-emerald-600"
          >
            <ImageIcon className="h-4 w-4 text-emerald-800" />
          </Button>

          {isRecording && (
            <div className="flex-1 flex items-center justify-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700">{t("recording")}</span>
              </div>
              <div className="text-sm font-mono text-emerald-600">{formatRecordingTime(recordingTime)}</div>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: "1s",
                    }}
                  ></div>
                ))}
              </div>
            </div>
          )}

          {!isRecording && (
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={getPlaceholderText()}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 h-10 text-sm"
            />
          )}

          {!inputValue.trim() && !isRecording && (
            <Button
              variant="outline"
              size="icon"
              onClick={startRecording}
              className="flex-shrink-0 h-10 w-10 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              <Mic className="h-4 w-4 text-white" />
            </Button>
          )}
        </div>

        {(inputValue.trim() || isRecording) && (
          <Button
            onClick={isRecording ? stopRecording : handleSendMessage}
            disabled={!inputValue.trim() && !isRecording}
            className="flex-shrink-0 h-10 px-4 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
    </div>
  )
}
