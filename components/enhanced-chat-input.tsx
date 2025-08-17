import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Send, Mic, Loader2, X } from "lucide-react";
import { ImageFile } from '@/hooks/use-image-upload';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import Image from 'next/image';

interface EnhancedChatInputProps {
  input: string;
  setInput: (value: string) => void;
  selectedImages: ImageFile[];
  triggerImageUpload: () => void;
  removeImage: (imageId: string) => void;
  clearImages: () => void;
  formatFileSize: (bytes: number) => string;
  handleSubmit: (e: React.FormEvent) => void;
  sendMessage?: (message: string) => void; // Add direct send message function
  isLoading: boolean;
  suggestedQueries?: string[];
  onSuggestedQueryClick?: (query: string) => void;
}

export function EnhancedChatInput({
  input,
  setInput,
  selectedImages,
  triggerImageUpload,
  removeImage,
  clearImages,
  formatFileSize,
  handleSubmit,
  sendMessage,
  isLoading,
  suggestedQueries = [],
  onSuggestedQueryClick
}: EnhancedChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      console.log('Voice transcription completed:', transcript);
      console.log('Selected images count:', selectedImages.length);
      
      // Submit immediately with the transcript
      if (transcript.trim() || selectedImages.length > 0) {
        console.log('Auto-submitting voice transcription with images');
        
        // Use sendMessage directly if available, otherwise use handleSubmit
        if (sendMessage) {
          // Clear the input first
          setInput('');
          // Send the message directly
          sendMessage(transcript);
        } else {
          // Fallback to the original method
          setInput(transcript);
          setTimeout(() => {
            const syntheticEvent = {
              preventDefault: () => {}
            } as React.FormEvent;
            handleSubmit(syntheticEvent);
          }, 50);
        }
      }
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
    }
  });

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
    <div className="fixed bottom-0 left-0 right-0 lg:left-80 z-30 p-4 flex justify-center bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="w-full max-w-4xl mx-auto">
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

      {/* Image Preview - Attached to Input */}
      {selectedImages.length > 0 && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-700">
              Selected Images ({selectedImages.length})
            </span>
            <button
              onClick={clearImages}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-200">
                  <Image
                    src={`data:${image.type};base64,${image.data}`}
                    alt={image.name}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="mt-1 text-xs text-emerald-600 text-center truncate w-16">
                  {formatFileSize(image.size)}
                </div>
              </div>
            ))}
          </div>
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
            </div>
          )}

          {/* Voice Recording Button - Available when text input is empty, regardless of image selection */}
          {!input.trim() && !isRecording && !isProcessing && !isLoading && (
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
    </div>
  );
}
