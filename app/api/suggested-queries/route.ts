import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: string; [key: string]: unknown }[]; // Properly typed to handle both string and structured content
  id?: string;
}

// Always return between MIN and MAX suggestions
const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 4;

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
    const systemPrompt = `You are an expert agricultural assistant that generates highly relevant follow-up questions for farmers based on their conversation context.

CORE PRINCIPLES:
1. Generate questions that farmers would ACTUALLY ask next in their situation
2. Focus on PRACTICAL, ACTIONABLE follow-ups that help farmers make decisions
3. Consider the farming context: crop type, season, location, current problem, weather conditions
4. Build on the assistant's last advice to go deeper into implementation

QUESTION GENERATION STRATEGY:
- IMPLEMENTATION: "How exactly do I do this?" "What materials do I need?" "When should I start?"
- RISK PREVENTION: "What could go wrong?" "How do I prevent problems?" "What signs should I watch for?"
- TIMING: "When is the best time?" "How long will this take?" "What's the deadline?"
- ALTERNATIVES: "What if this doesn't work?" "Are there other options?" "What's cheaper/easier?"
- QUANTIFICATION: "How much do I need?" "What's the cost?" "How many days/weeks?"
- EVIDENCE: "How do I know it's working?" "What results should I expect?" "How do other farmers do this?"

CONTEXT ANALYSIS:
- Identify: Current crop, farming stage, location, weather concern, specific problem mentioned
- Understand: What advice was just given, what the farmer is trying to achieve
- Consider: Immediate next steps, potential complications, resource needs

LANGUAGE RULES:
- Use the SAME language as the farmer's last message
- If conversation is mixed languages, match the most recent user message
- Keep questions natural and conversational, like a farmer would actually ask
- Use farming terminology appropriate to the region

QUESTION QUALITY:
- Make each question DISTINCT and serve a different purpose
- Avoid generic questions - be specific to the farming situation
- Focus on the farmer's immediate concerns and next decisions
- Each question should help the farmer take concrete action

OUTPUT FORMAT: Return ONLY a JSON array of 3-4 questions, nothing else.
Example: ["How much fertilizer per acre?", "When do I apply it?", "What if it rains after application?"]`;

    // Prepare messages for Sarvam API
    const apiMessages = [
      { content: systemPrompt, role: 'system' },
      { 
        content: `CONVERSATION CONTEXT:
${conversationContext}

TASK: Analyze this farming conversation and generate 3-4 highly relevant follow-up questions that this farmer would naturally ask next.

ANALYSIS CHECKLIST:
- What crop/farming issue is being discussed?
- What specific advice was just given by the assistant?
- What would the farmer need to know to implement this advice?
- What practical concerns or next steps would they have?
- What evidence or validation would they want?

Generate questions that help the farmer:
1. Understand HOW to implement the advice
2. Know WHEN to take action
3. Prepare for potential PROBLEMS
4. Understand the COSTS or RESOURCES needed

Return ONLY the JSON array with 3-4 questions.`, 
        role: 'user' 
      }
    ];

    // Utility: promise timeout
    const fetchWithTimeout = async (url: string, opts: RequestInit & { timeout?: number }) => {
      const { timeout = 12000, ...rest } = opts;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout);
      try {
        return await fetch(url, { ...rest, signal: controller.signal });
      } finally {
        clearTimeout(t);
      }
    };

    // Call Sarvam AI API with retry logic + timeout
    let response: Response | undefined;
    let attempt = 0;
    const maxRetries = 2;
    
    while (attempt <= maxRetries) {
      try {
        response = await fetchWithTimeout('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            model: 'sarvam-m'
          }),
          timeout: 10000 + attempt * 3000
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

    // Enhanced heuristic fallback function with better context analysis
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

        // Extract farming context
        const cropMatch = raw.match(/(pyaaj|प्याज|onion|tomato|टमाटर|wheat|गेहूं|rice|धान|potato|आलू)/i);
        const cropRef = cropMatch ? cropMatch[0] : '';
        
        // Check for specific farming activities mentioned
        const hasWeather = lower.includes('मौसम') || lower.includes('weather') || lower.includes('rain') || lower.includes('बारिश');
        const hasPest = lower.includes('pest') || lower.includes('disease') || lower.includes('रोग') || lower.includes('कीट');
        const hasPrice = lower.includes('price') || lower.includes('मंडी') || lower.includes('sell') || lower.includes('बेच');
        const hasFertilizer = lower.includes('fertilizer') || lower.includes('खाद') || lower.includes('उर्वरक');

        if (isHindi) {
          if (hasWeather) add('मौसम के हिसाब से अभी सबसे जरूरी काम कौन सा है?');
          if (hasPest && cropRef) add(`${cropRef} में रोग की पहचान कैसे करूं?`);
          if (hasPrice) add('अभी बेचना ठीक है या कुछ दिन और इंतजार करूं?');
          if (hasFertilizer) add('यह खाद कितनी मात्रा में डालनी चाहिए?');
          if (cropRef && !hasPest) add(`${cropRef} की देखभाल में अभी कौन सी गलती न करूं?`);
          add('इस सलाह को फॉलो करने में कितना खर्च आएगा?');
          add('कितने दिन में नतीजा दिखने लगेगा?');
        } else if (isOdia) {
          if (hasWeather) add('ପାଗ ଅନୁସାରେ ବର୍ତ୍ତମାନ ସବୁଠୁ ଜରୁରୀ କାମ କଣ?');
          if (hasPest && cropRef) add('ଫସଲରେ ରୋଗର ଚିହ୍ନ କେମିତି ଚିହ୍ନିବି?');
          if (hasPrice) add('ବର୍ତ୍ତମାନ ବିକିବା ଭଲ ନା ଆଉ କିଛି ଦିନ ଅପେକ୍ଷା କରିବି?');
          if (hasFertilizer) add('ଏହି ସାର କେତେ ମାତ୍ରାରେ ଦେବି?');
          add('ଏହି ପରାମର୍ଶ ଫଲୋ କରିବାକୁ କେତେ ଖର୍ଚ୍ଚ ହେବ?');
          add('କେତେ ଦିନରେ ଫଳାଫଳ ଦେଖିବାକୁ ମିଳିବ?');
        } else {
          if (hasWeather) add('What\'s the most urgent task based on current weather?');
          if (hasPest && cropRef) add(`How do I identify early signs of disease in ${cropRef}?`);
          if (hasPrice) add('Should I sell now or wait for better prices?');
          if (hasFertilizer) add('What\'s the exact application rate for this fertilizer?');
          if (cropRef && !hasPest) add(`What mistakes should I avoid with ${cropRef} right now?`);
          add('How much will it cost to implement this advice?');
          add('How long before I see results?');
          add('What if the weather changes suddenly?');
        }

        return queries.slice(0,4);
      } catch {
        return [
          'How do I implement this step by step?',
          'What materials do I need for this?',
          'When is the best time to start?',
          'How much will this cost me?'
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

    let generatedContent: string | undefined;
    try {
      const data = await response.json();
      generatedContent = data.choices?.[0]?.message?.content;
      if (!generatedContent && Array.isArray(data.choices)) {
        // Try alternative shapes
        generatedContent = data.choices.map((c: any) => c?.message?.content).filter(Boolean).join('\n');
      }
    } catch (e) {
      console.warn('Failed parsing primary response JSON, using fallback heuristic', e);
    }

    if (!generatedContent) {
      console.warn('No content generated from Sarvam AI, switching to heuristic');
      const fallbackQueries = buildHeuristic();
      return NextResponse.json({ suggestedQueries: fallbackQueries, success: true, fallback: true, reason: 'empty_upstream' });
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
      // Enhanced heuristic fallback
      suggestedQueries = generatedContent
        .split(/\n|\r/)
        .map((l: string) => l.trim())
        .filter((l: string) => {
          // More intelligent filtering for farming questions
          return l.length > 0 && 
                 (l.endsWith('?') || /\?$/.test(l)) &&
                 !l.toLowerCase().includes('question') &&
                 !l.match(/^[0-9]+\./) && // Remove numbered lists
                 l.length > 10; // Avoid too short questions
        })
        .slice(0, 4);

      // If still no good questions, use the enhanced heuristic
      if (suggestedQueries.length === 0) {
        suggestedQueries = buildHeuristic();
      }
    }

    // Validate and clean queries with better filtering
    // Ensure minimum number of quality queries
    const ensureMinimum = (current: string[]): string[] => {
      if (current.length >= MIN_SUGGESTIONS) return current.slice(0, MAX_SUGGESTIONS);
      // Use heuristic to supplement
      const supplemental = buildHeuristic();
      const merged: string[] = [];
      const seen = new Set<string>();
      [...current, ...supplemental].forEach(q => {
        const cleaned = q.trim();
        if (!seen.has(cleaned) && cleaned.length >= 5) {
          seen.add(cleaned);
          merged.push(cleaned);
        }
      });
      return merged.slice(0, MAX_SUGGESTIONS);
    };

    const validQueries = ensureMinimum(
      suggestedQueries
        .filter((query: string) => {
          if (!query || query.trim().length < 5) return false;
          const cleaned = query.trim();
          // Remove generic or low-quality questions
          const lowQuality = [
            'what else', 'anything else', 'other questions', 'more info',
            'tell me more', 'क्या और', 'और क्या', 'अन्य प्रश्न'
          ];
          return !lowQuality.some(lq => cleaned.toLowerCase().includes(lq));
        })
        .map((query: string) => {
          // Clean up formatting
          return query.trim().replace(/^[0-9]+\.?\s*/, '').replace(/^[-•]\s*/, '');
        })
        .slice(0, MAX_SUGGESTIONS)
    );

    // Cache only if we have at least the minimum number
    if (validQueries.length >= MIN_SUGGESTIONS) {
      suggestionCache.set(cacheKey, {
        queries: validQueries,
        timestamp: Date.now()
      });
    }

    return NextResponse.json({ 
      suggestedQueries: validQueries,
      success: true,
      count: validQueries.length,
      fromCache: false,
      reliability: validQueries.length >= MIN_SUGGESTIONS ? 'stable' : 'degraded'
    });

  } catch (error) {
    console.error('Error generating suggested queries:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggested queries' }, 
      { status: 500 }
    );
  }
}
