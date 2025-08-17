"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Send, ImageIcon, Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useVoiceRecording } from "@/hooks/use-voice-recording"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onImageUpload: (file: File) => void
  suggestedQueries: string[]
  onSuggestedQueryClick: (query: string) => void
  userData?: {
    mainCrops?: string | string[]
    name?: string
    location?: string
    language?: string
    farmType?: string
    experience?: string
    farmSize?: string
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
  suggestedQueries,
  onSuggestedQueryClick,
  userData,
}: ChatInputProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use the voice recording hook
  const {
    isRecording,
    recordingTime,
    isProcessing,
    error: voiceError,
    startRecording,
    stopRecording,
  } = useVoiceRecording({
    onTranscriptionComplete: (transcript) => {
      // Send the transcript as a text message directly
      if (transcript.trim()) {
        onSendMessage(transcript);
      }
    },
    onError: (error) => {
      console.error('Voice recording error:', error)
      // You could show a toast notification here
    }
  })

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

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getPlaceholderText = () => {
    if (userData?.mainCrops) {
      const crops = Array.isArray(userData.mainCrops) ? userData.mainCrops.join(', ') : userData.mainCrops
      return t("askAboutSpecificCrops", { crops })
    }
    return t("askAboutCrops")
  }

  const getRecordingStatusText = () => {
    if (isProcessing) {
      return t("analyzing")
    }
    return t("recording")
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

      {/* Voice Error Display */}
      {voiceError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{voiceError}</p>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 h-10 w-10 bg-emerald-100 hover:bg-emerald-200 border-emerald-600"
            disabled={isRecording || isProcessing}
          >
            <ImageIcon className="h-4 w-4 text-emerald-800" />
          </Button>

          {(isRecording || isProcessing) && (
            <div className="flex-1 flex items-center justify-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                ) : (
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                )}
                <span className="text-sm font-medium text-emerald-700">
                  {getRecordingStatusText()}
                </span>
              </div>
              {isRecording && !isProcessing && (
                <>
                  <div className="text-sm font-mono text-emerald-600">
                    {formatRecordingTime(recordingTime)}
                  </div>
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
                </>
              )}
            </div>
          )}

          {!isRecording && !isProcessing && (
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={getPlaceholderText()}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 h-10 text-sm"
            />
          )}

          {!inputValue.trim() && !isRecording && !isProcessing && (
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

        {(inputValue.trim() || isRecording) && !isProcessing && (
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
