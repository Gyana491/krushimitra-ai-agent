import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * ENV required:
 *   GOOGLE_GENERATIVE_AI_API_KEY
 *
 * Example usage:
 * const result = await googleSearchGeminiTool.execute({
 *   context: {
 *     prompt: "Weather today in Kothri",
 *     model: "gemini-1.5-flash",
 *     useGoogleSearch: true,
 *     dynamicThreshold: 0.7
 *   }
 * });
 * console.log(result.text);
 * console.dir(result.response, { depth: null });
 */

/* =========================
   Zod Schemas and Types
========================= */

const PartSchema = z.object({
  text: z.string().optional(),
});

const ContentSchema = z.object({
  role: z.string().optional(),
  parts: z.array(PartSchema).optional(),
});

const CandidateSchema = z.object({
  content: ContentSchema.optional(),
  finishReason: z.string().optional(),
  groundingMetadata: z.any().optional(),
  avgLogprobs: z.number().optional(),
});

const UsageMetadataSchema = z.object({
  promptTokenCount: z.number().optional(),
  candidatesTokenCount: z.number().optional(),
  totalTokenCount: z.number().optional(),
}).partial();

const GeminiResponseSchema = z.object({
  candidates: z.array(CandidateSchema).optional(),
  usageMetadata: UsageMetadataSchema.optional(),
  modelVersion: z.string().optional(),
  responseId: z.string().optional(),
});

type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

/* =========================
   Tool Input/Output Schemas
========================= */

const InputSchema = z.object({
  // Primary convenience input
  prompt: z.string().min(1).describe("Single-turn text prompt."),

  // Optional: override model
  model: z.string().default("gemini-1.5-flash"),

  // Enable Google Search grounding (dynamic retrieval)
  useGoogleSearch: z.boolean().default(true),

  // 0..1 threshold; higher = only use retrieval when model is less confident
  dynamicThreshold: z.number().min(0).max(1).default(0.7),

  // Advanced: full contents to support multi-turn or multi-part messages
  contents: z
    .array(
      z.object({
        role: z.string().optional(),
        parts: z.array(z.object({ text: z.string() })).min(1),
      })
    )
    .optional(),
});

const OutputSchema = z.object({
  text: z.string().nullable(),
  response: z.any(), // full raw JSON response from Gemini
});

/* =========================
   Helper: Extract text safely
========================= */

function extractPrimaryText(json: GeminiResponse): string | null {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  if (!Array.isArray(parts) || parts.length === 0) return null;

  // Concatenate all text parts, fallback to first
  const combined = parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  return combined.length > 0 ? combined : null;
}

/* =========================
   Tool Implementation
========================= */

export const webResearch = createTool({
  id: "web-research",
  description:
    "Research topics using Google Gemini with optional dynamic retrieval from Google Search.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  execute: async ({ context }) => {
    const {
      prompt,
      model = "gemini-1.5-flash",
      useGoogleSearch = true,
      dynamicThreshold = 0.7,
      contents,
    } = context;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY is missing. Set it in your environment (e.g., .env)."
      );
    }

    // Build request body
    const body: Record<string, any> = {
      contents:
        contents && contents.length > 0
          ? contents
          : [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
    };

    if (useGoogleSearch) {
      body.tools = [
        {
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: "MODE_DYNAMIC",
              dynamic_threshold: dynamicThreshold,
            },
          },
        },
      ];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    // Call Gemini
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const raw = await res.json();

    // Validate/parse shape (non-fatal if fails; we still return raw)
    const parsed = GeminiResponseSchema.safeParse(raw);
    const text = parsed.success ? extractPrimaryText(parsed.data) : null;

    // Extract URLs and titles from groundingChunks if available
    let urls: Array<{ uri: string; title: string }> = [];
    try {
      const candidates = raw?.candidates ?? [];
      if (candidates.length > 0) {
        const groundingChunks = candidates[0]?.groundingMetadata?.groundingChunks ?? [];
        urls = groundingChunks
          .map((chunk: any) => {
            if (chunk?.web?.uri && chunk?.web?.title) {
              return { uri: chunk.web.uri, title: chunk.web.title };
            }
            return null;
          })
          .filter(Boolean);
      }
    } catch (e) {
      // fail silently, urls will be empty
    }

    return {
      text,
      urls,
    };
  },
});
