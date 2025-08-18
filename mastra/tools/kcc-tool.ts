import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// KCC API Base URL
const KCC_API_BASE_URL = 'https://kishancallvectordb-816972702925.asia-south1.run.app';

interface KCCApiResult {
  id: string;
  similarity: number;
  StateName: string;
  DistrictName: string;
  Category: string;
  QueryType: string;
  QueryText: string;
  KccAns: string;
  Crop: string;
  Season: string;
  CreatedOn: string;
}

interface KCCApiResponse {
  success: boolean;
  query: string;
  topK: number;
  filters?: Record<string, string>;
  resultsCount: number;
  searchTime: string;
  results: KCCApiResult[];
}

export const kccDatabaseTool = createTool({
  id: 'query-kcc-database',
  description: 'Query the Kisan Call Center database to retrieve relevant information from previous queries and answers. This tool should be called first for every user query to provide context and improve response accuracy.',
  inputSchema: z.object({
    query: z.string().describe('The user query to search for in the KCC database'),
    topK: z.number().int().positive().optional().describe('Maximum number of results to return (default: 5)'),
    stateName: z.string().optional().describe('Filter by state name'),
    districtName: z.string().optional().describe('Filter by district name'),
    category: z.string().optional().describe('Filter by category'),
    season: z.string().optional().describe('Filter by season (Kharif, Rabi, Summer)'),
    crop: z.string().optional().describe('Filter by crop name'),
  }),
  outputSchema: z.object({
    totalFound: z.number(),
    relevantResults: z.array(z.object({
      id: z.string(),
      similarity: z.number(),
      queryType: z.string(),
      queryText: z.string(),
      answer: z.string(),
      createdOn: z.string(),
      state: z.string().optional(),
      district: z.string().optional(),
      category: z.string().optional(),
      crop: z.string().optional(),
      season: z.string().optional(),
    })),
    searchSummary: z.string(),
    recommendations: z.array(z.string()),
    hasRelevantData: z.boolean(),
    searchTime: z.string(),
  }),
  execute: async ({ context }) => {
    return await queryKCCAPI(context);
  },
});

const queryKCCAPI = async (params: {
  query: string;
  topK?: number;
}): Promise<{
  totalFound: number;
  relevantResults: Array<{
    id: string;
    similarity: number;
    queryType: string;
    queryText: string;
    answer: string;
    createdOn: string;
    state?: string;
    district?: string;
    category?: string;
    crop?: string;
    season?: string;
  }>;
  searchSummary: string;
  recommendations: string[];
  hasRelevantData: boolean;
  searchTime: string;
}> => {
  const topK = params.topK || 5;

  try {
    // Build request body
    const requestBody: any = {
      query: params.query,
      topK: topK,
    };

    // Make API call
    const response = await fetch(`${KCC_API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const apiResponse: KCCApiResponse = await response.json();

    if (!apiResponse.success) {
      throw new Error('API returned unsuccessful response');
    }

    // Process results
    const processedResults = apiResponse.results.map((result: KCCApiResult) => ({
      id: result.id,
      similarity: result.similarity,
      queryType: result.QueryType,
      queryText: result.QueryText,
      answer: result.KccAns,
      createdOn: result.CreatedOn,
      state: result.StateName || undefined,
      district: result.DistrictName || undefined,
      category: result.Category || undefined,
      crop: result.Crop || undefined,
      season: result.Season || undefined,
    }));

    // Generate search summary and recommendations
    const searchSummary = `Found ${apiResponse.resultsCount} relevant records in KCC database for query: "${params.query}" in ${apiResponse.searchTime}. ${processedResults.length > 0 ? `Top result has ${Math.round(processedResults[0].similarity * 100)}% similarity.` : ''}`;
    
    const recommendations = generateRecommendations(processedResults, params.query);

    return {
      totalFound: apiResponse.resultsCount,
      relevantResults: processedResults,
      searchSummary,
      recommendations,
      hasRelevantData: apiResponse.resultsCount > 0,
      searchTime: apiResponse.searchTime,
    };

  } catch (error) {
    console.error('KCC API query error:', error);
    return {
      totalFound: 0,
      relevantResults: [],
      searchSummary: `Error querying KCC API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recommendations: [
        'API connection failed',
        'Check network connectivity',
        'Use alternative information sources'
      ],
      hasRelevantData: false,
      searchTime: '0ms',
    };
  }
};

// Helper function to generate recommendations based on results
function generateRecommendations(results: Array<{
  id: string;
  similarity: number;
  queryType: string;
  queryText: string;
  answer: string;
  createdOn: string;
  state?: string;
  district?: string;
  category?: string;
  crop?: string;
  season?: string;
}>, originalQuery: string): string[] {
  const recommendations: string[] = [];
  
  if (results.length > 0) {
    const topResult = results[0];
    
    if (topResult.similarity && topResult.similarity > 0.8) {
      recommendations.push('High similarity match found in KCC database - use this as primary reference');
    } else if (topResult.similarity && topResult.similarity > 0.5) {
      recommendations.push('Moderate similarity match found - combine with current research');
    } else {
      recommendations.push('Low similarity matches found - supplement with current information');
    }
    
    if (topResult.crop) {
      recommendations.push(`Consider crop-specific advice for ${topResult.crop}`);
    }
    
    if (topResult.state) {
      recommendations.push(`Regional context available for ${topResult.state}`);
    }

    if (topResult.season) {
      recommendations.push(`Seasonal context available for ${topResult.season}`);
    }

    if (topResult.category) {
      recommendations.push(`Category-specific information: ${topResult.category}`);
    }
  }
  
  recommendations.push('Always verify current conditions with weather and market data');
  recommendations.push('Consider using additional research tools for the most up-to-date information');
  
  return recommendations;
}
