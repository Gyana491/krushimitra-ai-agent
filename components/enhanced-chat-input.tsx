import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Send, Mic, Loader2 } from "lucide-react";
import { ImageFile } from '@/hooks/use-image-upload';
import { useVoiceRecording } from '@/hooks/use-voice-recording';

interface EnhancedChatInputProps {
  input: string;
  setInput: (value: string) => void;
  selectedImages: ImageFile[];
  triggerImageUpload: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  suggestedQueries?: string[];
  onSuggestedQueryClick?: (query: string) => void;
}

export function EnhancedChatInput({
  input,
  setInput,
  selectedImages,
  triggerImageUpload,
  handleSubmit,
  isLoading,
  suggestedQueries = [],
  onSuggestedQueryClick
}: EnhancedChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isVoiceSubmission, setIsVoiceSubmission] = useState(false);

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
      // Set transcript and mark as voice submission
      if (transcript.trim()) {
        setInput(transcript);
        setIsVoiceSubmission(true);
      }
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
    }
  });

  // Auto-submit when voice transcription sets the input
  useEffect(() => {
    if (isVoiceSubmission && input.trim()) {
      setIsVoiceSubmission(false);
      const syntheticEvent = {
        preventDefault: () => {}
      } as React.FormEvent;
      handleSubmit(syntheticEvent);
    }
  }, [input, isVoiceSubmission, handleSubmit]);

  const handleKeyPress: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Synthesize a simple form event if needed; otherwise rely on form onSubmit
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 max-w-4xl mx-auto">
      {/* Suggested Queries */}
      {suggestedQueries.length > 0 && (
        <div className="mb-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {suggestedQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestedQueryClick?.(query)}
                className="whitespace-nowrap text-xs px-3 py-1 h-auto min-w-fit flex-shrink-0 bg-muted/50 hover:bg-emerald-600 hover:text-white border-muted-foreground/20 hover:border-emerald-600 transition-colors"
              >
                {query}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Error Display */}
      {voiceError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{voiceError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={triggerImageUpload}
            className="flex-shrink-0 h-10 w-10 bg-emerald-100 hover:bg-emerald-200 border-emerald-600"
            disabled={isRecording || isProcessing || isLoading}
          >
            <ImageIcon className="h-4 w-4 text-emerald-800" />
          </Button>

          {/* Voice Recording Indicator */}
          {(isRecording || isProcessing) && (
            <div className="flex-1 flex items-center justify-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                ) : (
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                )}
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {isProcessing ? "Analyzing..." : "Recording"}
                </span>
              </div>
              {isRecording && !isProcessing && (
                <>
                  <div className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
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

          {/* Input Field */}
          {!isRecording && !isProcessing && (
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedImages.length > 0 ? "Describe what you want to know about these images..." : "Ask about farming, weather, crop prices, or upload images..."}
                onKeyPress={handleKeyPress}
                className="flex-1 h-10 text-sm pr-12"
                disabled={isLoading}
              />
              
              {/* Image count indicator */}
              {selectedImages.length > 0 && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    {selectedImages.length} 📷
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Voice Recording Button */}
          {!input.trim() && !isRecording && !isProcessing && selectedImages.length === 0 && !isLoading && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={startRecording}
              className="flex-shrink-0 h-10 w-10 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              <Mic className="h-4 w-4 text-white" />
            </Button>
          )}
        </div>

        {/* Send/Stop Button */}
        {(input.trim() || selectedImages.length > 0 || isRecording) && !isProcessing && (
          <Button
            type={isRecording ? "button" : "submit"}
            onClick={isRecording ? stopRecording : undefined}
            disabled={(!input.trim() && selectedImages.length === 0 && !isRecording) || isLoading}
            className="flex-shrink-0 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
}
