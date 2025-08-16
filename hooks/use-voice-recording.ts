import { useState, useRef, useCallback } from 'react';
import { useSpeechToText } from './use-speech-to-text';

interface VoiceRecordingHook {
  isRecording: boolean;
  recordingTime: number;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  onTranscriptionComplete?: (transcript: string) => void;
}

interface UseVoiceRecordingOptions {
  onTranscriptionComplete?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): VoiceRecordingHook {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm'); // Store the detected mime type
  
  const { convertSpeechToText, isProcessing } = useSpeechToText();

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder with the best supported format for Sarvam API
      let recorder: MediaRecorder;
      
      // Try different formats in order of preference for Sarvam API
      const supportedFormats = [
        'audio/webm',
        'audio/wav',
        'audio/ogg',
        'audio/mp4',
        'audio/mpeg'
      ];
      
      for (const format of supportedFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeTypeRef.current = format;
          recorder = new MediaRecorder(stream, { mimeType: format });
          break;
        }
      }
      
      // Fallback to default if none of the preferred formats are supported
      if (!recorder!) {
        mimeTypeRef.current = 'audio/webm'; // Default fallback
        recorder = new MediaRecorder(stream);
      }
      
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        try {
          // Create audio blob from recorded chunks with the detected mime type
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mimeTypeRef.current 
          });
          
          // Convert speech to text using Sarvam AI
          const transcript = await convertSpeechToText(audioBlob);
          
          if (transcript && options.onTranscriptionComplete) {
            options.onTranscriptionComplete(transcript);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to process audio';
          setError(errorMessage);
          if (options.onError) {
            options.onError(errorMessage);
          }
        }
      };

      recorder.onerror = (event) => {
        const errorMessage = 'Recording error occurred';
        console.error('MediaRecorder error:', event);
        setError(errorMessage);
        if (options.onError) {
          options.onError(errorMessage);
        }
      };

      // Start recording
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      // Start recording timer
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      if (options.onError) {
        options.onError(errorMessage);
      }
      console.error('Error starting recording:', err);
    }
  }, [isRecording, convertSpeechToText, options]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    try {
      // Stop the MediaRecorder
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Clear the recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Reset states
      setIsRecording(false);
      setRecordingTime(0);
      mediaRecorderRef.current = null;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      if (options.onError) {
        options.onError(errorMessage);
      }
      console.error('Error stopping recording:', err);
    }
  }, [isRecording, options]);

  return {
    isRecording,
    recordingTime,
    isProcessing,
    error,
    startRecording,
    stopRecording,
  };
}
