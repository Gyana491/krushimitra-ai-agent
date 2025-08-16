import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Send } from "lucide-react";
import { ImageFile } from '@/hooks/use-image-upload';

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

  const handleKeyPress: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Synthesize a simple form event if needed; otherwise rely on form onSubmit
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }
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

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={triggerImageUpload}
            className="flex-shrink-0 h-10 w-10 bg-emerald-100 hover:bg-emerald-200 border-emerald-600"
          >
            <ImageIcon className="h-4 w-4 text-emerald-800" />
          </Button>

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
        </div>

        <Button
          type="submit"
          disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
          className="flex-shrink-0 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
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
