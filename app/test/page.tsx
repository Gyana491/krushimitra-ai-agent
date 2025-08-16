'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/source';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { useChat } from '@/hooks/use-chat';
import { ChatHeader } from '@/components/chat-header';
import { ThreadsSidebar } from '@/components/threads-sidebar';
import Image from 'next/image';
import { ImagePreview } from '@/components/image-preview';

const ChatBotDemo = () => {
  const {
    // Input state
    input,
    setInput,
    model,
    setModel,
    
    // Messages state
    messages,
    status,
    streamingState,
    
    // Thread management
    currentThreadId,
    chatThreads,
    showThreadsList,
    setShowThreadsList,
    createNewThread,
    switchToThread,
    deleteThread,
    clearCurrentThread,
    exportThreads,
    importThreads,
    
    // Image handling
    selectedImages,
    handleImageUpload: _handleImageUpload, // eslint-disable-line @typescript-eslint/no-unused-vars
    removeImage,
    clearImages,
    triggerImageUpload,
    formatFileSize,
    
    // Chat actions
    handleSubmit
  } = useChat();

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <ChatHeader
          messages={messages}
          status={status}
          chatThreads={chatThreads}
          createNewThread={createNewThread}
          setShowThreadsList={setShowThreadsList}
          clearCurrentThread={clearCurrentThread}
        />

        {/* Threads List Sidebar */}
        <ThreadsSidebar
          showThreadsList={showThreadsList}
          setShowThreadsList={setShowThreadsList}
          chatThreads={chatThreads}
          currentThreadId={currentThreadId}
          switchToThread={switchToThread}
          deleteThread={deleteThread}
          createNewThread={createNewThread}
          exportThreads={exportThreads}
          importThreads={importThreads}
        />

        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-6xl mb-4">🌾</div>
                  <h2 className="text-xl font-semibold mb-2">Welcome to Farm Assistant</h2>
                  <p className="text-sm mb-4">
                    Ask me about weather, crop prices, farming advice, or upload images for analysis!
                  </p>
                  
                  {chatThreads.length > 1 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        💡 You have {chatThreads.length} chat threads. Click &quot;Threads&quot; to view all conversations.
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-2 text-xs">
                    <p>Try asking:</p>
                    <div className="space-y-1">
                      <p>&quot;What&apos;s the weather like today?&quot;</p>
                      <p>&quot;Market price of Potato in Cuttack&quot;</p>
                      <p>&quot;Best farming practices for rice&quot;</p>
                      <p>&quot;📷 Upload crop images for disease analysis&quot;</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                    <p>Shortcuts: Ctrl+N (new chat) • Ctrl+K (clear thread)</p>
                    <p>Supports: Text, Images (JPG, PNG, WebP, etc.)</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'ml-auto max-w-3xl' : 'mr-auto max-w-4xl'}`}>
                    {message.role === 'assistant' && (
                      <Sources>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case 'source-url':
                              return (
                                <>
                                  <SourcesTrigger
                                    count={
                                      message.parts.filter(
                                        (part) => part.type === 'source-url',
                                      ).length
                                    }
                                  />
                                  <SourcesContent key={`${message.id}-${i}`}>
                                    <Source
                                      key={`${message.id}-${i}`}
                                      href={part.url}
                                      title={part.url}
                                    />
                                  </SourcesContent>
                                </>
                              );
                            default:
                              return null;
                          }
                        })}
                      </Sources>
                    )}
                    <Message from={message.role} key={message.id}>
                      <MessageContent>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case 'text':
                              return (
                                <Response key={`${message.id}-${i}`}>
                                  {part.text}
                                </Response>
                              );
                            case 'image':
                              return (
                                <div key={`${message.id}-${i}`} className="mb-2">
                                  <Image 
                                    src={`data:${part.imageType};base64,${part.imageData}`}
                                    alt={part.imageName || 'Uploaded image'}
                                    width={256}
                                    height={256}
                                    className="max-w-sm max-h-64 rounded-lg border"
                                  />
                                  {part.imageName && (
                                    <p className="text-xs text-gray-500 mt-1">{part.imageName}</p>
                                  )}
                                </div>
                              );
                            case 'tool-call':
                              return (
                                <div key={`${message.id}-${i}`} className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                                    🔧 Tool Call: {part.toolName}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    ID: {part.toolCallId}
                                  </div>
                                  <details className="text-sm">
                                    <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
                                      View Arguments
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(part.toolArgs, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              );
                            case 'tool-result':
                              return (
                                <div key={`${message.id}-${i}`} className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                                    ✅ Tool Result
                                  </div>
                                  <details className="text-sm">
                                    <summary className="cursor-pointer text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
                                      View Result
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(part.toolResult, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              );
                            case 'reasoning':
                              return (
                                <Reasoning
                                  key={`${message.id}-${i}`}
                                  className="w-full"
                                  isStreaming={status === 'streaming'}
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>{part.text || ''}</ReasoningContent>
                                </Reasoning>
                              );
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  </div>
                ))}
              </>
            )}
            
            {/* Show streaming state */}
            {status === 'streaming' && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                  🔄 {streamingState.currentStep}
                </div>
                
                {/* Show active tool calls */}
                {streamingState.toolCalls.map(toolCall => (
                  <div key={toolCall.id} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${
                        toolCall.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                        toolCall.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className="font-medium">{toolCall.name}</span>
                      <span className="text-xs text-gray-500">({toolCall.status})</span>
                    </div>
                    {Object.keys(toolCall.args).length > 0 && (
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Args: {JSON.stringify(toolCall.args)}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Show partial response */}
                {streamingState.finalResponse && (
                  <Message from="assistant" key="streaming">
                    <MessageContent>
                      <Response>{streamingState.finalResponse}</Response>
                    </MessageContent>
                  </Message>
                )}
              </div>
            )}
            
            {(status === 'submitted' || status === 'streaming') && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          {/* Image Preview Area */}
          <ImagePreview
            selectedImages={selectedImages}
            removeImage={removeImage}
            clearImages={clearImages}
            formatFileSize={formatFileSize}
          />
          
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder={selectedImages.length > 0 ? "Describe what you want to know about these images..." : "Ask about farming, weather, crop prices, or upload images..."}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton
                type="button"
                variant="ghost"
                onClick={triggerImageUpload}
                className="flex items-center gap-2"
              >
                <span>📷</span>
                <span>Images</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {/* Models removed */}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit 
              disabled={(!input.trim() && selectedImages.length === 0) || status === 'streaming'} 
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;