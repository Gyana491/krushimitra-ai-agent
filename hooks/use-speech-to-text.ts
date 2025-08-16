import { useState, useCallback } from 'react';

interface SpeechToTextHook {
  isProcessing: boolean;
  convertSpeechToText: (audioBlob: Blob) => Promise<string>;
  error: string | null;
}

export function useSpeechToText(): SpeechToTextHook {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertSpeechToText = useCallback(async (audioBlob: Blob): Promise<string> => {
    if (!audioBlob) {
      throw new Error('No audio blob provided');
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create FormData for the API request to our Next.js API route
      const formData = new FormData();
      
      // Determine file extension based on blob type
      const audioType = audioBlob.type || 'audio/webm';
      const getFileExtension = (mimeType: string) => {
        switch (mimeType) {
          case 'audio/wav':
          case 'audio/x-wav':
          case 'audio/wave':
            return 'wav';
          case 'audio/mp3':
          case 'audio/mpeg':
          case 'audio/mpeg3':
          case 'audio/x-mpeg-3':
          case 'audio/x-mp3':
            return 'mp3';
          case 'audio/ogg':
          case 'audio/opus':
            return 'ogg';
          case 'audio/mp4':
          case 'audio/x-m4a':
            return 'm4a';
          case 'audio/webm':
          default:
            return 'webm';
        }
      };
      
      const fileExtension = getFileExtension(audioType);
      const file = new File([audioBlob], `recording-${Date.now()}.${fileExtension}`, {
        type: audioType
      });
      
      formData.append('audio', file);
      formData.append('language_code', 'unknown'); // Let Sarvam auto-detect the language

      // Make the API request to our Next.js API route
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.transcript) {
        throw new Error('No transcript received from API');
      }

      return result.transcript;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Speech to text conversion error:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    convertSpeechToText,
    error,
  };
}
