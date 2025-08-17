import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: string; [key: string]: unknown }[];
  id?: string;
}

interface UserProfile {
  name?: string;
  language?: string;
  experience?: string;
  farmType?: string;
  farmSize?: string;
  mainCrops?: string[];
  mainCropsJoined?: string;
}

interface LocationContext {
  address?: string;
  cityName?: string;
  stateName?: string;
  areaSizeAcres?: string;
  latitude?: number;
  longitude?: number;
}

interface SuggestedQueriesRequestBody {
  messages: ChatMessage[];
  userProfile?: UserProfile;
  locationContext?: LocationContext;
}

export async function POST(req: NextRequest) {
  try {
  const { messages, userProfile, locationContext } = (await req.json()) as Partial<SuggestedQueriesRequestBody>;

    console.log('=== SUGGESTED QUERIES API START ===');
    console.log('Received messages count:', messages?.length);
  console.log('Messages payload:', messages?.map((m: ChatMessage) => ({ role: m.role, contentLength: typeof m.content === 'string' ? m.content.length : Array.isArray(m.content) ? m.content.length : 0 })));
    console.log('User profile available:', !!userProfile);
    if (userProfile) {
      console.log('User context:', {
        name: userProfile.name,
        language: userProfile.language,
        experience: userProfile.experience,
        farmType: userProfile.farmType,
        mainCrops: userProfile.mainCrops || userProfile.mainCropsJoined
      });
    }
    console.log('Location context available:', !!locationContext);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages payload');
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Early validation - we need at least a user and assistant message
    if (messages.length < 2 || !messages.some(m => m.role === 'user') || !messages.some(m => m.role === 'assistant')) {
      console.log('Insufficient context for suggestions - need both user and assistant messages');
      return NextResponse.json({ suggestedQueries: [], success: true, fallback: true });
    }

    // Get the Sarvam API key from environment variables
    const apiKey = process.env.SARVAM_API_KEY;
    console.log('Sarvam API key available:', !!apiKey);
    if (!apiKey) {
      console.error('Sarvam API key not configured');
      return NextResponse.json({ error: 'Sarvam API key not configured' }, { status: 500 });
    }

    // Prepare the minimal conversation context for query generation (just last exchange)
    const conversationContext = messages
      .map((msg: ChatMessage) => {
        let raw = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        // No need to truncate much since we only have 2 messages max
        if (raw.length > 500) raw = raw.slice(0, 500) + '...'; 
        return `${msg.role}: ${raw}`;
      })
      .join('\n');

    // Create system prompt for generating suggested queries
    const userInfo = userProfile || locationContext ? `
USER PROFILE:
${userProfile ? `- Name: ${userProfile.name || 'Not specified'}
- Language: ${userProfile.language || 'Not specified'}
- Experience: ${userProfile.experience || 'Not specified'}
- Farm Type: ${userProfile.farmType || 'Not specified'}
- Farm Size: ${userProfile.farmSize || 'Not specified'}
- Main Crops: ${userProfile.mainCrops || userProfile.mainCropsJoined || 'Not specified'}` : ''}
${locationContext ? `- Location: ${locationContext.address || 'Not specified'}
- City: ${locationContext.cityName || 'Not specified'}  
- State: ${locationContext.stateName || 'Not specified'}
- Farm Area: ${locationContext.areaSizeAcres || 'Not specified'}
- Coordinates: ${locationContext.latitude ? `${locationContext.latitude}, ${locationContext.longitude}` : 'Not specified'}` : ''}

Use this profile to make suggestions specific to their crops, experience level, location and farm context.
` : '';

  const systemPrompt = `Generate exactly 4 farming follow-up questions based on the recent conversation exchange.
${userInfo}
Requirements:
- Same language as the user message${userProfile?.language ? ` (${userProfile.language})` : ''}
- Build on the assistant's advice with deeper/practical questions
- From farmer's perspective (what would they ask next)
- Each question 10-25 words, specific and actionable
- Consider user's crops (${userProfile?.mainCrops || userProfile?.mainCropsJoined || 'general'}), experience level, and location

Return ONLY a valid JSON array of 4 strings.
Example: ["কি সার দেব?", "কখন রোপণ করব?", "দাম কত?", "রোগ হলে কি করব?"]`;

    // Prepare messages for Sarvam API
    const apiMessages = [
      { content: systemPrompt, role: 'system' },
      { content: `Context:\n${conversationContext}\n\nJSON array:`, role: 'user' }
    ];

    console.log('Conversation context length:', conversationContext.length);
    console.log('System prompt length:', systemPrompt.length);
    console.log('API messages prepared:', apiMessages.length, 'messages');

    // Call Sarvam AI API with retry logic
  let response: Response | undefined;
    let attempt = 0;
    const maxRetries = 2;
    
    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt + 1}/${maxRetries + 1} - Calling Sarvam API...`);
        response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            model: 'sarvam-m',
            max_tokens: 1000,
            temperature: 0.7
          })
        });
        console.log('Sarvam API response status:', response.status, response.statusText);
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
      console.log('No response from Sarvam API after retries, using heuristic fallback');
      const fallbackQueries = buildHeuristic();
      return NextResponse.json({ suggestedQueries: fallbackQueries, success: true, fallback: true });
    }

    if (!response.ok) {
      // Upstream failure after retries -> return heuristic suggestions with diagnostic info
      const upstreamBody = await response.text().catch(() => '');
      console.log('Sarvam API failed with status:', response.status, 'Body:', upstreamBody.slice(0, 500));
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
    console.log('Sarvam API response data:', data);
    const generatedContent = data.choices?.[0]?.message?.content;
    console.log('Generated content from Sarvam:', generatedContent);

    if (!generatedContent) {
      console.log('No content generated from Sarvam AI, using heuristic fallback');
      const fallbackQueries = buildHeuristic();
      return NextResponse.json({ suggestedQueries: fallbackQueries, success: true, fallback: true });
    }

    // Parse the JSON response with enhanced error handling
    let suggestedQueries: string[] = [];
    try {
      const cleaned = generatedContent.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
      console.log('Cleaning generated content:', cleaned.slice(0, 300));
      
      // Enhanced JSON parsing with multiple strategies
      let parsedQueries: string[] = [];
      
      // Strategy 1: Direct JSON parse
      try {
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
          parsedQueries = JSON.parse(cleaned);
          console.log('Strategy 1 (Direct JSON) succeeded:', parsedQueries.length, 'queries');
        }
      } catch (directError) {
        console.log('Strategy 1 (Direct JSON) failed:', directError instanceof Error ? directError.message : 'Unknown error');
        
        // Strategy 2: Extract and fix JSON array
        try {
          const arrayMatch = cleaned.match(/\[.*\]/);
          if (arrayMatch) {
            let jsonStr = arrayMatch[0];
            // Fix common JSON issues
            jsonStr = jsonStr.replace(/,\s*]/g, ']'); // Remove trailing commas
            jsonStr = jsonStr.replace(/"\s*,\s*"/g, '", "'); // Fix spacing around commas
            jsonStr = jsonStr.replace(/([^"]),\s*"([^"]*)"(?!\s*[,\]])/g, '$1, "$2"'); // Fix missing quotes
            
            parsedQueries = JSON.parse(jsonStr);
            console.log('Strategy 2 (Fixed JSON) succeeded:', parsedQueries.length, 'queries');
          }
        } catch (fixedError) {
          console.log('Strategy 2 (Fixed JSON) failed:', fixedError instanceof Error ? fixedError.message : 'Unknown error');
          
          // Strategy 3: Extract individual quoted strings with question marks
          const questionMatches = cleaned.match(/"[^"]*[?？][^"]*"/g);
          if (questionMatches && questionMatches.length > 0) {
            parsedQueries = questionMatches
              .map((match: string) => match.slice(1, -1).trim()) // Remove quotes and trim
              .filter((q: string) => q.length > 5 && q.includes('?')); // Quality filter
            console.log('Strategy 3 (Question extraction) found:', parsedQueries.length, 'queries');
          } else {
            // Strategy 4: Handle truncated responses - extract partial but complete questions
            const partialMatches = cleaned.match(/"[^"]*?[?？][^"]*?"/g) || 
                                 cleaned.match(/([^\[\]",]{10,}[?？])/g);
            if (partialMatches) {
              parsedQueries = partialMatches
                .map((match: string) => match.replace(/^["'\s]+|["'\s]+$/g, '').trim())
                .filter((q: string) => q.length > 8 && (q.includes('?') || q.includes('？')))
                .slice(0, 4);
              console.log('Strategy 4 (Partial extraction) found:', parsedQueries.length, 'queries');
            }
          }
        }
      }
      
      // Quality validation and cleanup
      if (parsedQueries && Array.isArray(parsedQueries)) {
        suggestedQueries = parsedQueries
          .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 5)
          .map(q => q.trim())
          .filter(q => q.includes('?') || q.includes('？'))
          .slice(0, 4); // Ensure max 4 questions
        
        console.log('Final validated queries:', suggestedQueries.length);
      }
      
      console.log('Parsed suggested queries:', suggestedQueries);
    } catch (parseError) {
      console.log('JSON parsing failed:', parseError, 'Using enhanced fallback');
      
      // Enhanced fallback - look for question patterns in any format
      const questionPatterns = [
        // Odia/Hindi question patterns
        /([^\n"]{10,}[?？])/g,
        // Line-based extraction
        /^[^"]*([^"]{10,}[?？])[^"]*$/gm
      ];
      
      for (const pattern of questionPatterns) {
        const matches = generatedContent.match(pattern);
        if (matches && matches.length > 0) {
          suggestedQueries = matches
            .map((m: string) => m.trim().replace(/^["'\s]+|["'\s]+$/g, ''))
            .filter((q: string) => q.length > 5 && q.includes('?'))
            .slice(0, 4);
          if (suggestedQueries.length > 0) break;
        }
      }
      
      console.log('Enhanced fallback queries:', suggestedQueries);
    }

    // Validate and clean queries
    const validQueries = suggestedQueries
      .filter((query: string) => query && query.trim().length > 0)
      .slice(0, 4);

    console.log('Final valid queries:', validQueries);

    console.log('=== SUGGESTED QUERIES API END ===');
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
