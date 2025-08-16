import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import axios from 'axios';

export const perplexityTool = createTool({
  id: 'perplexity-research',
  description: 'Research topics using Perplexity AI for real-time web data',
  inputSchema: z.object({
    query: z.string().describe('Research query or topic'),
    maxResults: z.number().optional().default(5)
  }),
  outputSchema: z.object({
    research: z.string(),
    sources: z.array(z.string()),
    keyInsights: z.array(z.string())
  }),
  execute: async ({ context }) => {
    const { query } = context;
  
    try {
      // If no Perplexity API key is provided, use a mock research response
      if (!process.env.PERPLEXITY_API_KEY) {
        return {
          research: `Research on "${query}": This is a mock research response since no Perplexity API key is configured. In a real implementation, this would contain comprehensive research data from Perplexity AI.`,
          sources: ['https://example.com/source1', 'https://example.com/source2'],
          keyInsights: [
            'Key insight 1 about the topic',
            'Important trend related to the query',
            'Actionable takeaway for content creation'
          ]
        };
      }

      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide comprehensive research with key insights and cite your sources.'
          },
          {
            role: 'user',
            content: `Research and provide detailed information about: ${query}. Focus on recent developments, trends, and actionable insights.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
    
      return {
        research: content,
        sources: extractSources(content),
        keyInsights: extractKeyInsights(content)
      };
    } catch (error) {
      console.error('Perplexity API error:', error);
      // Fallback to mock data if API fails
      return {
        research: `Research on "${query}": API request failed, using fallback research data. This would contain real research in production.`,
        sources: ['https://example.com/fallback'],
        keyInsights: ['Fallback insight about the topic']
      };
    }
  }
});

function extractSources(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s)]+/g;
  return content.match(urlRegex) || [];
}

function extractKeyInsights(content: string): string[] {
  return content.split('\n').filter(line => 
    line.includes('insight') || line.includes('trend') || line.includes('important')
  ).slice(0, 5); // Limit to 5 insights
}
