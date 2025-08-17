import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts: Array<{
  type: 'text' | 'reasoning' | 'source-url' | 'tool-call' | 'tool-result' | 'image' | 'suggested-queries';
    text?: string;
    url?: string;
    toolName?: string;
    toolArgs?: any;
    toolResult?: any;
    toolCallId?: string;
    imageData?: string;
    imageName?: string;
    imageType?: string;
  queries?: string[]; // for suggested-queries
  }>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
  status: 'pending' | 'completed' | 'error';
}

export interface StreamingState {
  currentStep: string;
  toolCalls: ToolCall[];
  reasoning: string[];
  finalResponse: string;
}

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [streamingState, setStreamingState] = useState<StreamingState>({
    currentStep: '',
    toolCalls: [],
    reasoning: [],
    finalResponse: ''
  });

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus('idle');
    setStreamingState({
      currentStep: '',
      toolCalls: [],
      reasoning: [],
      finalResponse: ''
    });
  }, []);

  const updateMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  }, []);

  return {
    messages,
    status,
    streamingState,
    setStatus,
    setStreamingState,
    addMessage,
    clearMessages,
    updateMessages
  };
};
