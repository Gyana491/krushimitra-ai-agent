'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ApiTestPage = () => {
  const [message, setMessage] = useState('What is the weather like today?');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [response, setResponse] = useState('');
  const logsRef = useRef<HTMLDivElement>(null);

  const addLog = (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${log}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  const clearLogs = () => {
    setLogs([]);
    setResponse('');
    console.clear();
  };

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const testChatApi = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse('');
    addLog('🚀 Starting API test...');
  addLog(`📤 Sending message: \"${message}\"`);

    try {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      };

      addLog(`📋 Request body: ${JSON.stringify(requestBody, null, 2)}`);
      addLog('🌐 Making POST request to /api/chat');

      const startTime = Date.now();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const requestDuration = Date.now() - startTime;
      addLog(`⏱️ Request completed in ${requestDuration}ms`);
      addLog(`📊 Response status: ${response.status} ${response.statusText}`);
      addLog(`📋 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

  addLog('📥 Response received, checking if it\'s a stream...');

      // Check if response is a stream
      const contentType = response.headers.get('content-type');
      addLog(`📄 Content-Type: ${contentType}`);

      if (response.body) {
        addLog('🔄 Processing stream response...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              addLog('✅ Stream finished');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            addLog(`📦 Received chunk: ${chunk.length} bytes`);
            addLog(`📝 Chunk content: ${chunk}`);
            
            fullResponse += chunk;
            setResponse(fullResponse);
          }
        } catch (streamError) {
          addLog(`❌ Stream error: ${streamError}`);
        }
      } else {
        // Fallback for non-stream response
        const text = await response.text();
        addLog(`📝 Non-stream response: ${text}`);
        setResponse(text);
      }

      addLog('✅ API test completed successfully!');

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      addLog(`🔍 Error details: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chat API Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Message:</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your test message..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={testChatApi} 
              disabled={isLoading || !message.trim()}
              className="flex-1"
            >
              {isLoading ? '🔄 Testing...' : '🚀 Test Chat API'}
            </Button>
            <Button 
              onClick={clearLogs} 
              variant="outline"
            >
              🗑️ Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Real-time Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={logsRef}
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md h-96 overflow-y-auto font-mono text-sm"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click &quot;Test Chat API&quot; to start.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md h-96 overflow-y-auto">
              {response ? (
                <pre className="whitespace-pre-wrap text-sm">{response}</pre>
              ) : (
                <div className="text-gray-500">No response yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Endpoint:</strong> POST /api/chat</div>
            <div><strong>Agent:</strong> weatherAgent</div>
            <div><strong>Expected Response:</strong> Streaming response using V4 compatible format</div>
            <div><strong>Request Format:</strong></div>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`{
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ]
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiTestPage;
