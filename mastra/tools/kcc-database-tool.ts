import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import pg from 'pg';

// Initialize PostgreSQL connection pool
const { Pool } = pg;

interface KCCDataRecord {
  QueryType: string;
  QueryText: string;
  KccAns: string;
  CreatedOn: string;
  StateName: string;
  DistrictName: string;
  BlockName: string;
  Crop: string;
}

interface KCCSearchResult {
  success: boolean;
  count: number;
  results: KCCDataRecord[];
  relevanceScore?: number;
}

export const kccDatabaseTool = createTool({
  id: 'query-kcc-database',
  description: 'Query the Kisan Call Center database to retrieve relevant information from previous queries and answers. This tool should be called first for every user query to provide context and improve response accuracy.',
  inputSchema: z.object({
    query: z.string().describe('The user query to search for in the KCC database'),
    searchType: z.enum(['exact', 'similar', 'related', 'semantic']).optional().describe('Search type: exact match, similar queries, related topics, or semantic search (default: semantic)'),
    limit: z.number().int().positive().optional().describe('Maximum number of results to return (default: 5)'),
    includeLocation: z.boolean().optional().describe('Whether to include location-based filtering (default: true)'),
  }),
  outputSchema: z.object({
    totalFound: z.number(),
    relevantResults: z.array(z.object({
      queryType: z.string(),
      queryText: z.string(),
      answer: z.string(),
      createdOn: z.string(),
      state: z.string().optional(),
      district: z.string().optional(),
      block: z.string().optional(),
      crop: z.string().optional(),
      relevanceScore: z.number().optional(),
    })),
    searchSummary: z.string(),
    recommendations: z.array(z.string()),
    hasRelevantData: z.boolean(),
  }),
  execute: async ({ context }) => {
    return await queryKCCDatabase(context);
  },
});

const queryKCCDatabase = async (params: {
  query: string;
  searchType?: 'exact' | 'similar' | 'related' | 'semantic';
  limit?: number;
  includeLocation?: boolean;
}): Promise<{
  totalFound: number;
  relevantResults: any[];
  searchSummary: string;
  recommendations: string[];
  hasRelevantData: boolean;
}> => {
  const searchType = params.searchType || 'semantic';
  const limit = parseInt(params.limit?.toString() || '5', 10);
  const includeLocation = params.includeLocation !== false;

  // Preprocess query for better semantic matching
  const preprocessedQuery = preprocessQuery(params.query);

  try {
    // Get database connection from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    const pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    let sqlQuery: string;
    let queryParams: any[];
    let keywords: string[] = [];

    // Build search query based on search type
    console.log(`Debug: Building query with limit: ${limit} (type: ${typeof limit})`);
    
    switch (searchType) {
      case 'exact':
        // Exact match in QueryText
        sqlQuery = `
          SELECT "QueryType", "QueryText", "KccAns", "CreatedOn", "StateName", "DistrictName", "BlockName", "Crop"
          FROM kcc_data 
          WHERE "QueryText" ILIKE $1
          ORDER BY "CreatedOn" DESC
          LIMIT $2
        `;
        queryParams = [params.query, limit];
        break;

      case 'similar':
        // Similar queries using multiple search terms
        const searchTerms = params.query.toLowerCase().split(' ').filter(term => term.length > 2);
        const likeConditions = searchTerms.map((_, index) => `"QueryText" ILIKE $${index + 1}`).join(' OR ');
        
        sqlQuery = `
          SELECT "QueryType", "QueryText", "KccAns", "CreatedOn", "StateName", "DistrictName", "BlockName", "Crop"
          FROM kcc_data 
          WHERE ${likeConditions}
          ORDER BY "CreatedOn" DESC
          LIMIT $2
        `;
        queryParams = [...searchTerms.map(term => `%${term}%`), limit];
        break;

      case 'related':
        // Related queries using full-text search for semantic matching
        sqlQuery = `
          SELECT "QueryType", "QueryText", "KccAns", "CreatedOn", "StateName", "DistrictName", "BlockName", "Crop",
                 ts_rank(to_tsvector('english', "QueryText" || ' ' || "QueryType" || ' ' || COALESCE("Crop", '')), plainto_tsquery('english', $1)) as rank
          FROM kcc_data 
          WHERE to_tsvector('english', "QueryText" || ' ' || "QueryType" || ' ' || COALESCE("Crop", '')) @@ plainto_tsquery('english', $1)
          ORDER BY rank DESC, "CreatedOn" DESC
          LIMIT $2
        `;
                queryParams = [params.query, limit];
        break;

      case 'semantic':
        // Keyword-based semantic search with improved ranking
        const keywords = extractKeywords(preprocessedQuery);
        const keywordConditions = keywords.map((_, index) => 
          `("QueryText" ILIKE $${index + 1} OR "QueryType" ILIKE $${index + 1} OR "Crop" ILIKE $${index + 1})`
        ).join(' AND ');
        
        sqlQuery = `
          SELECT "QueryType", "QueryText", "KccAns", "CreatedOn", "StateName", "DistrictName", "BlockName", "Crop",
                 ${keywords.map((_, index) => 
                   `CASE WHEN "QueryText" ILIKE $${index + 1} THEN 3 
                         WHEN "QueryType" ILIKE $${index + 1} THEN 2 
                         WHEN "Crop" ILIKE $${index + 1} THEN 1 
                         ELSE 0 END`
                 ).join(' + ') + ' as keyword_score'
                 }
          FROM kcc_data 
          WHERE ${keywordConditions}
          ORDER BY keyword_score DESC, "CreatedOn" DESC
          LIMIT $2
        `;
        queryParams = [...keywords.map(keyword => `%${keyword}%`), limit];
        break;

      default:
        throw new Error(`Invalid search type: ${searchType}`);
      }

      console.log(`Debug: Query params:`, queryParams.map((p, i) => `${i}: ${p} (${typeof p})`));

      const client = await pool.connect();
    
    try {
      const result = await client.query(sqlQuery, queryParams);
      
      if (result.rowCount === 0) {
        return {
          totalFound: 0,
          relevantResults: [],
          searchSummary: `No relevant data found in KCC database for query: "${params.query}"`,
          recommendations: [
            'Consider broadening the search terms',
            'Check if the query is related to a different crop or region',
            'Use the perplexityTool for current information'
          ],
          hasRelevantData: false,
        };
      }

      // Process and score results
      const processedResults = result.rows.map((row: any, index: number) => {
        // Calculate relevance score based on query similarity and recency
        const querySimilarity = calculateSimilarity(params.query.toLowerCase(), row.QueryText.toLowerCase());
        const recencyScore = calculateRecencyScore(row.CreatedOn);
        
        // Use keyword score for semantic search, otherwise calculate our own score
        let relevanceScore: number;
        if (searchType === 'semantic' && row.keyword_score !== null && typeof row.keyword_score === 'number') {
          // Normalize keyword score to 0-1 scale (max score is 3 * number of keywords)
          const maxPossibleScore = keywords.length * 3;
          relevanceScore = Math.min(row.keyword_score / maxPossibleScore, 1.0);
        } else {
          relevanceScore = (querySimilarity * 0.7) + (recencyScore * 0.3);
        }

        return {
          queryType: row.QueryType,
          queryText: row.QueryText,
          answer: row.KccAns,
          createdOn: row.CreatedOn,
          state: row.StateName || undefined,
          district: row.DistrictName || undefined,
          block: row.BlockName || undefined,
          crop: row.Crop || undefined,
          relevanceScore: Math.round(relevanceScore * 100) / 100,
        };
      });

      // Sort by relevance score
      processedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      // Generate search summary and recommendations
      const searchSummary = `Found ${result.rowCount} relevant records in KCC database for query: "${params.query}". Top result has ${Math.round((processedResults[0]?.relevanceScore || 0) * 100)}% relevance.`;
      
      const recommendations = generateRecommendations(processedResults, params.query);

      await client.release();
      await pool.end();

      return {
        totalFound: result.rowCount || 0,
        relevantResults: processedResults.slice(0, limit),
        searchSummary,
        recommendations,
        hasRelevantData: true,
      };

    } catch (error) {
      await client.release();
      throw error;
    }

  } catch (error) {
    console.error('KCC Database query error:', error);
    return {
      totalFound: 0,
      relevantResults: [],
      searchSummary: `Error querying KCC database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recommendations: [
        'Database connection failed',
        'Use perplexityTool for current information',
        'Check database configuration'
      ],
      hasRelevantData: false,
    };
  }
};

// Helper function to calculate similarity between two strings
function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.split(' ').filter(word => word.length > 2);
  const textWords = text.split(' ').filter(word => word.length > 2);
  
  if (queryWords.length === 0 || textWords.length === 0) return 0;
  
  const matchingWords = queryWords.filter(word => 
    textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
  );
  
  return matchingWords.length / queryWords.length;
}

// Helper function to calculate recency score
function calculateRecencyScore(createdOn: string): number {
  try {
    const createdDate = new Date(createdOn);
    const now = new Date();
    const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Score decreases with age, max score for recent entries
    if (daysDiff <= 30) return 1.0; // Last month
    if (daysDiff <= 90) return 0.8; // Last 3 months
    if (daysDiff <= 365) return 0.6; // Last year
    return 0.4; // Older
  } catch {
    return 0.5; // Default score if date parsing fails
  }
}

// Helper function to generate recommendations based on results
function generateRecommendations(results: any[], originalQuery: string): string[] {
  const recommendations: string[] = [];
  
  if (results.length > 0) {
    const topResult = results[0];
    
    if (topResult.relevanceScore && topResult.relevanceScore > 0.8) {
      recommendations.push('High relevance match found in KCC database - use this as primary reference');
    } else if (topResult.relevanceScore && topResult.relevanceScore > 0.5) {
      recommendations.push('Moderate relevance match found - combine with current research');
    } else {
      recommendations.push('Low relevance matches found - supplement with current information');
    }
    
    if (topResult.crop) {
      recommendations.push(`Consider crop-specific advice for ${topResult.crop}`);
    }
    
    if (topResult.state) {
      recommendations.push(`Regional context available for ${topResult.state}`);
    }
  }
  
  recommendations.push('Always verify current conditions with weather and market data');
  recommendations.push('Use perplexityTool for the most up-to-date information');
  
  return recommendations;
}

// Helper function to extract meaningful keywords from query
function extractKeywords(query: string): string[] {
  // Convert to lowercase and remove extra whitespace
  let processed = query.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Remove common stop words that don't add meaning
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
  
  // Split into words and filter out stop words and short words
  const keywords = processed
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .filter(word => /^[a-zA-Z]+$/.test(word)) // Only alphabetic words
    .slice(0, 5); // Limit to top 5 keywords to avoid overly complex queries
  
  // If no keywords found, return the original query as a single keyword
  return keywords.length > 0 ? keywords : [processed];
}

// Helper function to preprocess queries for better semantic matching
function preprocessQuery(query: string): string {
  // Convert to lowercase and remove extra whitespace
  let processed = query.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Add common agricultural synonyms and related terms
  const synonyms: Record<string, string[]> = {
    'pest': ['insect', 'bug', 'disease', 'infection', 'problem'],
    'disease': ['pest', 'infection', 'symptom', 'problem', 'issue'],
    'fertilizer': ['nutrient', 'manure', 'compost', 'feeding'],
    'irrigation': ['watering', 'water', 'moisture', 'drought'],
    'harvest': ['yield', 'production', 'crop', 'harvesting'],
    'soil': ['land', 'ground', 'earth', 'field'],
    'plant': ['crop', 'seedling', 'sapling', 'growth'],
    'yield': ['production', 'output', 'harvest', 'result'],
    'organic': ['natural', 'chemical-free', 'traditional'],
    'chemical': ['pesticide', 'herbicide', 'fertilizer', 'treatment']
  };
  
  // Expand query with synonyms
  let expandedQuery = processed;
  for (const [term, synonymList] of Object.entries(synonyms)) {
    if (processed.includes(term)) {
      expandedQuery += ' ' + synonymList.join(' ');
    }
  }
  
  // Add common agricultural terms that might be implied
  const agriculturalTerms = ['farming', 'agriculture', 'cultivation', 'growing'];
  if (!expandedQuery.includes('farming') && !expandedQuery.includes('agriculture')) {
    expandedQuery += ' farming agriculture';
  }
  
  return expandedQuery;
}
