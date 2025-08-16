import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface MandiPriceResponse {
  records: Array<{
    state: string;
    district: string;
    market: string;
    commodity: string;
    variety: string;
    grade: string;
    arrival_date: string;
    min_price: number;
    max_price: number;
    modal_price: number;
  }>;
  total: number;
  limit: number;
  offset: number;
}

interface PriceData {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
}

export const mandiPriceTool = createTool({
  id: 'get-mandi-prices',
  description: 'Get current daily prices of various commodities from various markets (mandi) across India using data.gov.in API. Returns data with fallback recommendations when no prices found.',
  inputSchema: z.object({
    commodity: z.string().optional().describe('Commodity name (e.g., "banana", "rice", "wheat")'),
    state: z.string().optional().describe('State name (e.g., "Odisha", "Maharashtra", "Karnataka")'),
    district: z.string().optional().describe('District name'),
    market: z.string().optional().describe('Market/mandi name'),
    variety: z.string().optional().describe('Commodity variety'),
    grade: z.string().optional().describe('Commodity grade (e.g., "FAQ", "Premium")'),
    limit: z.number().optional().describe('Maximum number of records to return (default: 100)'),
    offset: z.number().optional().describe('Number of records to skip for pagination (default: 0)'),
  }),
  outputSchema: z.object({
    totalRecords: z.number(),
    prices: z.array(z.object({
      state: z.string(),
      district: z.string(),
      market: z.string(),
      commodity: z.string(),
      variety: z.string(),
      grade: z.string(),
      arrivalDate: z.string(),
      minPrice: z.number(),
      maxPrice: z.number(),
      modalPrice: z.number(),
    })),
    summary: z.object({
      averageMinPrice: z.number(),
      averageMaxPrice: z.number(),
      averageModalPrice: z.number(),
      priceRange: z.string(),
      marketsCount: z.number(),
      districtsCount: z.number(),
    }),
    fallbackRecommendation: z.string().describe('Recommendation to use perplexityTool for additional research when no data found'),
    hasData: z.boolean().describe('Whether the tool returned actual price data'),
  }),
  execute: async ({ context }) => {
    return await getMandiPrices(context);
  },
});

const getMandiPrices = async (params: {
  commodity?: string;
  state?: string;
  district?: string;
  market?: string;
  variety?: string;
  grade?: string;
  limit?: number;
  offset?: number;
}) => {
  const API_KEY = '579b464db66ec23bdd000001f7b9118f0392498c416efae957d3f2c9';
  const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    'api-key': API_KEY,
    'format': 'json',
    'limit': (params.limit || 100).toString(),
    'offset': (params.offset || 0).toString(),
  });

  // Add filters if provided
  if (params.state) {
    queryParams.append('filters[state.keyword]', params.state);
  }
  if (params.district) {
    queryParams.append('filters[district]', params.district);
  }
  if (params.market) {
    queryParams.append('filters[market]', params.market);
  }
  if (params.commodity) {
    queryParams.append('filters[commodity]', params.commodity);
  }
  if (params.variety) {
    queryParams.append('filters[variety]', params.variety);
  }
  if (params.grade) {
    queryParams.append('filters[grade]', params.grade);
  }

  const url = `${BASE_URL}?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json() as MandiPriceResponse;
    
    if (!data.records || data.records.length === 0) {
      return {
        totalRecords: 0,
        prices: [],
        summary: {
          averageMinPrice: 0,
          averageMaxPrice: 0,
          averageModalPrice: 0,
          priceRange: 'No data available',
          marketsCount: 0,
          districtsCount: 0,
        },
        fallbackRecommendation: `No mandi price data found for ${params.commodity || 'commodity'} in ${params.state || 'location'}. Recommend using perplexityTool to research current market conditions, recent price reports, and alternative sources.`,
        hasData: false,
      };
    }

    // Process and clean the data
    const prices: PriceData[] = data.records.map(record => ({
      state: record.state,
      district: record.district,
      market: record.market,
      commodity: record.commodity,
      variety: record.variety,
      grade: record.grade,
      arrivalDate: record.arrival_date,
      minPrice: parseFloat(record.min_price?.toString() || '0'),
      maxPrice: parseFloat(record.max_price?.toString() || '0'),
      modalPrice: parseFloat(record.modal_price?.toString() || '0'),
    }));

    // Calculate summary statistics
    const validPrices = prices.filter(p => p.minPrice > 0 && p.maxPrice > 0);
    const uniqueMarkets = new Set(prices.map(p => p.market));
    const uniqueDistricts = new Set(prices.map(p => p.district));

    const summary = {
      averageMinPrice: validPrices.length > 0 
        ? Math.round(validPrices.reduce((sum, p) => sum + p.minPrice, 0) / validPrices.length)
        : 0,
      averageMaxPrice: validPrices.length > 0
        ? Math.round(validPrices.reduce((sum, p) => sum + p.maxPrice, 0) / validPrices.length)
        : 0,
      averageModalPrice: validPrices.length > 0
        ? Math.round(validPrices.reduce((sum, p) => sum + p.modalPrice, 0) / validPrices.length)
        : 0,
      priceRange: validPrices.length > 0
        ? `${Math.min(...validPrices.map(p => p.minPrice))} - ${Math.max(...validPrices.map(p => p.maxPrice))}`
        : 'No valid prices',
      marketsCount: uniqueMarkets.size,
      districtsCount: uniqueDistricts.size,
    };

    return {
      totalRecords: data.total || prices.length,
      prices,
      summary,
      fallbackRecommendation: `Successfully retrieved ${prices.length} price records. No fallback research needed.`,
      hasData: true,
    };

  } catch (error) {
    throw new Error(`Failed to fetch mandi prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
