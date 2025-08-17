import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: any; // can be string or structured parts
  id?: string;
}

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per minute per IP

// Simple cache to reduce API calls
const suggestionCache = new Map<string, { queries: string[]; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

function getCacheKey(messages: ChatMessage[]): string {
  try {
    const lastMessages = messages
      .slice(-4)
      .map(m => `${m.role}:${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
      .join('|');
    // Use Buffer to handle utf-8 safely
    return Buffer.from(lastMessages, 'utf-8').toString('base64').replace(/=+$/, '').slice(0, 48);
  } catch {
    // Fallback simple hash
    let hash = 0;
    const text = messages.slice(-4).map(m => (typeof m.content === 'string' ? m.content : '')).join('|');
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making more requests.' }, 
        { status: 429 }
      );
    }

    const { messages } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = getCacheKey(messages);
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached suggestions');
      return NextResponse.json({ 
        suggestedQueries: cached.queries,
        success: true,
        cached: true
      });
    }

    // Get the Sarvam API key from environment variables
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Sarvam API key not configured' }, { status: 500 });
    }

    // Prepare (and lightly truncate) the conversation context for query generation
    const MAX_PER_MESSAGE_CHARS = 1200; // keep payload reasonable to avoid 400s from upstream
    const conversationContext = messages
      .slice(-6)
      .map((msg: ChatMessage) => {
        let raw = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        if (raw.length > MAX_PER_MESSAGE_CHARS) raw = raw.slice(-MAX_PER_MESSAGE_CHARS); // take tail (recent)
        return `${msg.role}: ${raw}`;
      })
      .join('\n');

    // Create system prompt for generating suggested queries
  const systemPrompt = `You are an agricultural assistant creating NEXT user follow-up questions (act like the farmer will ask them). From the recent conversation craft 3-4 short, distinct questions the farmer is likely to ask next. Requirements:

1. Perspective: First-person (implicit) farmer intent – no explanations, just the question.
2. Relevance: Build directly on the assistant's last guidance (go deeper, clarify, apply, quantify, prevent, or decide timing).
3. Diversity: Cover different useful angles (e.g. risk prevention, timing, inputs, alternatives, post-harvest) – avoid near duplicates.
4. Specificity: Reference crop / condition / location ONLY if clearly present; don't hallucinate.
5. Language: Output in the same language/script as the MOST RECENT user message (detect Hindi / Odia / English automatically). If mixed, prefer the assistant reply language.
6. Format: JSON array of strings only, e.g. ["QUESTION 1?", "QUESTION 2?", "QUESTION 3?"]
7. Exclusions: Do NOT repeat an earlier user question verbatim. Do NOT include numbering, markdown, or extra text outside the JSON array.

Goal: Help the farmer advance the conversation efficiently with high-value next questions.

Return ONLY the JSON array.`;

    // Prepare messages for Sarvam API
    const apiMessages = [
      { content: systemPrompt, role: 'system' },
      { content: `Conversation so far:\n${conversationContext}\n\nGenerate ONLY a JSON array with 3-4 follow-up questions.`, role: 'user' }
    ];

    // Call Sarvam AI API with retry logic
  let response: Response | undefined;
    let attempt = 0;
    const maxRetries = 2;
    
    while (attempt <= maxRetries) {
      try {
        response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            model: 'sarvam-m'
          })
        });
        if (response.ok) {
          break; // Success, exit retry loop
        }

        if (response.status === 429) {
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempt++;
            continue;
          }
          return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        // For other errors, capture body for diagnostics then attempt limited retries
        const errorBody = await response.text().catch(() => '');
        console.error('Sarvam API non-429 error', response.status, errorBody);
        if (attempt < maxRetries) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 750 * attempt));
          continue;
        }
        // Break out; we'll handle fallback below
        break;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Linear backoff for other errors
      }
    }

    // Heuristic fallback function if upstream fails
    const buildHeuristic = (): string[] => {
      try {
        const lastUser = [...messages].reverse().find(m => m.role === 'user');
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        const source = `${lastAssistant?.content || ''}\n${lastUser?.content || ''}`;
        const raw = typeof source === 'string' ? source : JSON.stringify(source);
        const lower = raw.toLowerCase();
        const isHindi = /[\u0900-\u097F]/.test(raw);
        const isOdia = /[\u0B00-\u0B7F]/.test(raw);

        const queries: string[] = [];

        const add = (q: string) => {
          if (!queries.includes(q) && queries.length < 4) queries.push(q);
        };

        const cropMatch = raw.match(/(pyaaj|प्याज|onion)/i);
        const cropRef = cropMatch ? cropMatch[0] : '';

        if (isHindi) {
          if (lower.includes('मौसम') || lower.includes('weather')) add('अगले 3 दिनों के मौसम को देखते हुए अभी क्या तैयारी करूँ?');
          if (cropRef) add(`${cropRef.includes('प्याज') ? 'प्याज' : 'फसल'} में रोग से बचाव के लिए अगला कदम क्या है?`);
          if (lower.includes('जल निकासी') || lower.includes('drain')) add('जल निकासी बेहतर करने का सबसे त्वरित समाधान क्या है?');
          add('अगर बारिश जारी रही तो नुकसान कम कैसे करूँ?');
        } else if (isOdia) {
          if (lower.includes('ପାଗ') || lower.includes('weather')) add('ଆସନ୍ତା ୩ ଦିନ ପାଗ ଦେଖି କଣ ପ୍ରସ୍ତୁତି କରିବି?');
          if (cropRef) add('ପିଆଜ ରୋଗ ରୋକଥାମ ପାଇଁ ବର୍ତ୍ତମାନ କଣ କରିବି?');
          if (lower.includes('drain') || /ନିସ୍ସରଣ/.test(raw)) add('ଜଳ ନିସ୍ସରଣ ଶୀଘ୍ର କେମିତି ସୁଧାରିବି?');
          add('ଲମ୍ବା ବର୍ଷାର ପ୍ରଭାବ କେମିତି କମେଇବି?');
        } else {
          if (lower.includes('weather') || lower.includes('forecast')) add('Given the next 3 days forecast what should I prepare first?');
            if (cropRef) add(`How do I prevent disease pressure in my ${cropRef.toLowerCase().includes('onion') ? 'onion' : 'crop'} right now?`);
          if (lower.includes('drain')) add('What is the quickest low-cost way to improve drainage?');
          add('If rain continues how do I reduce losses?');
        }

        return queries.slice(0,4);
      } catch {
        return [
          'अगला सवाल क्या पूछूँ?',
          'फसल देखभाल के लिए अभी कौन सा कदम प्राथमिक है?',
          'मौसम जोखिम कम करने के उपाय क्या हैं?'
        ];
      }
    };

    if (!response) {
      const fallbackQueries = buildHeuristic();
      return NextResponse.json({ suggestedQueries: fallbackQueries, success: true, fallback: true });
    }

    if (!response.ok) {
      // Upstream failure after retries -> return heuristic suggestions with diagnostic info
      const upstreamBody = await response.text().catch(() => '');
      const fallbackQueries = buildHeuristic();
      return NextResponse.json({
        suggestedQueries: fallbackQueries,
        success: true,
        fallback: true,
        upstreamStatus: response.status,
        upstreamBody: upstreamBody?.slice(0, 500)
      }, { status: 200 });
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from Sarvam AI');
    }

    // Parse the JSON response
    let suggestedQueries: string[] = [];
    try {
      const cleaned = generatedContent.trim();
      // Attempt direct JSON parse first
      if (cleaned.startsWith('[')) {
        suggestedQueries = JSON.parse(cleaned);
      } else {
        // Extract first JSON array substring
        const match = cleaned.match(/\[[\s\S]*?\]/);
        if (match) {
          suggestedQueries = JSON.parse(match[0]);
        } else {
          throw new Error('No JSON array found');
        }
      }
  } catch {
      // Heuristic fallback
      suggestedQueries = generatedContent
        .split(/\n|\r/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && (l.endsWith('?') || /\?$/.test(l)))
        .slice(0, 4);
    }

    // Validate and clean queries
    const validQueries = suggestedQueries
      .filter((query: string) => query && query.trim().length > 0)
      .slice(0, 4);

    // Cache the results
    suggestionCache.set(cacheKey, {
      queries: validQueries,
      timestamp: Date.now()
    });

    return NextResponse.json({ 
      suggestedQueries: validQueries,
      success: true 
    });

  } catch (error) {
    console.error('Error generating suggested queries:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggested queries' }, 
      { status: 500 }
    );
  }
}
