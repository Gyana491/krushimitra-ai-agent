import { useCallback } from 'react';
import { ChatMessage, ToolCall, StreamingState } from './use-chat-messages';
import { ImageFile } from './use-image-upload';

export const useChatAPI = () => {
  const sendMessage = useCallback(async (
    userMessage: string,
    selectedImages: ImageFile[],
    messages: ChatMessage[],
    updateMessages: (newMessages: ChatMessage[]) => void,
    setStatus: (status: 'idle' | 'submitted' | 'streaming' | 'error') => void,
    setStreamingState: (updater: (prev: StreamingState) => StreamingState) => void
  ) => {
    if (!userMessage.trim() && selectedImages.length === 0) return;

    // Create message parts array
    const messageParts: ChatMessage['parts'] = [];
    
    // Add text part if there's a message
    if (userMessage.trim()) {
      messageParts.push({ type: 'text', text: userMessage });
    }
    
    // Add image parts
    selectedImages.forEach(image => {
      messageParts.push({
        type: 'image',
        imageData: image.data,
        imageName: image.name,
        imageType: image.type
      });
    });

    // Add user message to the thread
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage || 'Image message',
      parts: messageParts,
    };

    const messagesWithUser = [...messages, userMsg];
    updateMessages(messagesWithUser);
    setStatus('submitted');
    setStreamingState(prev => ({
      ...prev,
      currentStep: 'Connecting...',
      toolCalls: [],
      reasoning: [],
      finalResponse: ''
    }));

    try {
      // Build the conversation history for the API
      const conversationHistory = messagesWithUser.map(msg => {
        // For API, we need to convert our message format to AI SDK format
        if (msg.role === 'user') {
          const content: any[] = [];
          
          msg.parts.forEach(part => {
            if (part.type === 'text' && part.text) {
              content.push({
                type: 'text',
                text: part.text
              });
            } else if (part.type === 'image' && part.imageData && part.imageType) {
              content.push({
                type: 'image',
                image: `data:${part.imageType};base64,${part.imageData}`
              });
            }
          });

          return {
            role: msg.role,
            content: content.length === 1 && content[0].type === 'text' ? content[0].text : content
          };
        } else {
          return {
            role: msg.role,
            content: msg.content
          };
        }
      });

      // Retrieve lightweight user context (same key used in page.tsx or fallback)
      let userContext: any = undefined;
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('cropwise-user-data') || window.localStorage.getItem('userProfileData');
          if (raw) {
            const parsed = JSON.parse(raw);
            // Whitelist only fields we care about
            const { name, location, language, farmType, experience, mainCrops, farmSize, goals } = parsed;
            userContext = { name, location, language, farmType, experience, mainCrops, farmSize, goals };
          }
        }
      } catch (e) {
        console.warn('Unable to load user context for chat request', e);
      }

      const requestBody = {
        messages: conversationHistory,
        ...(userContext ? { userContext } : {})
      };

      console.log('Sending conversation to /api/chat:', requestBody);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStatus('streaming');

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let assistantMessageId = `assistant-${Date.now()}`;
        let currentToolCalls: ToolCall[] = [];
        let currentReasoning: string[] = [];

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('Stream finished');
              setStatus('idle');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            console.log('Received chunk:', chunk);
            
            // Parse the streaming response
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                try {
                  // Extract the JSON part after the prefix (like "0:", "f:", "b:", "c:", "9:", "a:", "e:", "d:")
                  const colonIndex = line.indexOf(':');
                  if (colonIndex > 0) {
                    const prefix = line.substring(0, colonIndex);
                    const jsonPart = line.substring(colonIndex + 1);
                    const parsed = JSON.parse(jsonPart);
                    
                    switch (prefix) {
                      case 'f': // Step/message ID
                        if (parsed.messageId) {
                          setStreamingState(prev => ({
                            ...prev,
                            currentStep: `Step: ${parsed.messageId}`
                          }));
                        }
                        break;
                      
                      case 'b': // Tool call start
                        if (parsed.toolCallId && parsed.toolName) {
                          const newToolCall: ToolCall = {
                            id: parsed.toolCallId,
                            name: parsed.toolName,
                            args: {},
                            status: 'pending'
                          };
                          currentToolCalls.push(newToolCall);
                          setStreamingState(prev => ({
                            ...prev,
                            currentStep: `Calling tool: ${parsed.toolName}`,
                            toolCalls: [...currentToolCalls]
                          }));
                        }
                        break;
                      
                      case 'c': // Tool call arguments delta
                        if (parsed.toolCallId && parsed.argsTextDelta) {
                          const toolIndex = currentToolCalls.findIndex(t => t.id === parsed.toolCallId);
                          if (toolIndex !== -1) {
                            setStreamingState(prev => ({
                              ...prev,
                              currentStep: `Building arguments for ${currentToolCalls[toolIndex].name}...`
                            }));
                          }
                        }
                        break;
                      
                      case '9': // Tool call complete with args
                        if (parsed.toolCallId && parsed.args) {
                          const toolIndex = currentToolCalls.findIndex(t => t.id === parsed.toolCallId);
                          if (toolIndex !== -1) {
                            currentToolCalls[toolIndex].args = parsed.args;
                            setStreamingState(prev => ({
                              ...prev,
                              currentStep: `Executing ${currentToolCalls[toolIndex].name}...`,
                              toolCalls: [...currentToolCalls]
                            }));
                          }
                        }
                        break;
                      
                      case 'a': // Tool call result
                        if (parsed.toolCallId && parsed.result) {
                          const toolIndex = currentToolCalls.findIndex(t => t.id === parsed.toolCallId);
                          if (toolIndex !== -1) {
                            currentToolCalls[toolIndex].result = parsed.result;
                            currentToolCalls[toolIndex].status = 'completed';
                            setStreamingState(prev => ({
                              ...prev,
                              currentStep: `${currentToolCalls[toolIndex].name} completed`,
                              toolCalls: [...currentToolCalls]
                            }));
                          }
                        }
                        break;
                      
                      case '0': // Text content streaming
                        if (typeof parsed === 'string') {
                          fullResponse += parsed;
                          setStreamingState(prev => ({
                            ...prev,
                            currentStep: 'Generating response...',
                            finalResponse: fullResponse
                          }));
                        }
                        break;
                      
                      case 'e': // Step end
                        if (parsed.finishReason) {
                          setStreamingState(prev => ({
                            ...prev,
                            currentStep: `Step finished: ${parsed.finishReason}`
                          }));
                        }
                        break;
                      
                      case 'd': // Complete
                        if (parsed.finishReason) {
                          setStreamingState(prev => ({
                            ...prev,
                            currentStep: 'Complete!'
                          }));
                        }
                        break;
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                  console.log('Skipping line:', line, 'Error:', e);
                }
              }
            }
          }

          // Add the complete assistant message with all parts
          if (fullResponse.trim() || currentToolCalls.length > 0) {
            const messageParts: ChatMessage['parts'] = [];
            
            // Add tool calls as parts
            currentToolCalls.forEach(toolCall => {
              messageParts.push({
                type: 'tool-call',
                toolName: toolCall.name,
                toolArgs: toolCall.args,
                toolCallId: toolCall.id
              });
              
              if (toolCall.result) {
                messageParts.push({
                  type: 'tool-result',
                  toolResult: toolCall.result,
                  toolCallId: toolCall.id
                });
              }
            });
            
            // Add final response as text
            if (fullResponse.trim()) {
              messageParts.push({
                type: 'text',
                text: fullResponse
              });
            }

            const assistantMsg: ChatMessage = {
              id: assistantMessageId,
              role: 'assistant',
              content: fullResponse,
              parts: messageParts
            };

            updateMessages([...messagesWithUser, assistantMsg]);
          }

        } catch (streamError) {
          console.error('Stream error:', streamError);
          setStatus('error');
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('error');
      
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        parts: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      };
      
      updateMessages([...messagesWithUser, errorMsg]);
    }
  }, []);

  return {
    sendMessage
  };
};
