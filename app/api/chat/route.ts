import { mastra } from "../../../mastra";
import { createV4CompatibleResponse } from "@mastra/core/agent";

interface UserContext {
  name?: string;
  location?: string;
  language?: string;
  farmType?: string;
  experience?: string;
  mainCrops?: string;
  farmSize?: string;
  latitude?: number;
  longitude?: number;
  cityName?: string;
  stateName?: string;
}

function buildUserContextSystemMessage(userContext: UserContext): string {
  // Only include defined fields
  const entries = Object.entries(userContext).filter(([k, v]) => k !== 'goals' && v !== undefined && v !== null && v !== "");
  const lines = entries.map(([k, v]) => `${k}: ${v}`);
  return `USER CONTEXT\n${lines.join("\n")}\n---\nUse this factual profile to tailor agronomic, weather, and market advice.\nAdjust language to the user's preferred language if specified (language field).\nDo NOT redundantly ask for these details unless they are missing or clarification is truly needed.\nIf location is present, prioritize localized recommendations.\n`; 
}

export async function POST(req: Request) {
  const { messages, userContext } = await req.json();

  const enrichedMessages = Array.isArray(messages) ? [...messages] : [];

  if (userContext && typeof userContext === 'object') {
    const systemContent = buildUserContextSystemMessage(userContext as UserContext);
    // Prepend or replace any existing system message that we previously added
    const existingIndex = enrichedMessages.findIndex(
      (m: { role: string; content: string }) => m.role === 'system' && typeof m.content === 'string' && m.content.startsWith('USER CONTEXT')
    );
    if (existingIndex >= 0) {
      enrichedMessages[existingIndex].content = systemContent;
    } else {
      enrichedMessages.unshift({ role: 'system', content: systemContent });
    }
  }

  console.log(enrichedMessages);

  const myAgent = mastra.getAgent("kccAgent");
  const stream = await myAgent.stream(enrichedMessages);

  return createV4CompatibleResponse(stream.toUIMessageStreamResponse().body!);
}