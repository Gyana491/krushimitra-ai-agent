import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commodity = searchParams.get('commodity');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const market = searchParams.get('market');
    const variety = searchParams.get('variety');
    const grade = searchParams.get('grade');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const API_KEY = process.env.MANDI_PRICE_API_KEY;
    const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Mandi Price API key not configured', prices: [], totalRecords: 0 },
        { status: 500 }
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      'api-key': API_KEY,
      'format': 'json',
      'limit': limit,
      'offset': offset,
    });

    // Add filters if provided
    if (state) {
      queryParams.append('filters[state.keyword]', state);
    }
    if (district) {
      queryParams.append('filters[district]', district);
    }
    if (market) {
      queryParams.append('filters[market]', market);
    }
    if (commodity) {
      queryParams.append('filters[commodity]', commodity);
    }
    if (variety) {
      queryParams.append('filters[variety]', variety);
    }
    if (grade) {
      queryParams.append('filters[grade]', grade);
    }

    const url = `${BASE_URL}?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json() as MandiPriceResponse;

    if (!data.records || data.records.length === 0) {
      return NextResponse.json({
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
      });
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

    return NextResponse.json({
      totalRecords: data.total || prices.length,
      prices,
      summary,
    });

  } catch (error) {
    console.error('Error fetching mandi prices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch mandi prices', 
        prices: [], 
        totalRecords: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
