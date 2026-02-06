"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { RefreshCw, X, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import mandiIndex from '@/mastra/index/mandi-index.json';

interface PriceRecord {
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

interface MandiPriceTableProps {
  className?: string;
}

export const MandiPriceTable: React.FC<MandiPriceTableProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique values for filters
  const states = mandiIndex.State || [];
  const districts = mandiIndex.District || [];
  const commodities = mandiIndex.Commodity || [];

  // Fetch mandi prices
  const fetchMandiPrices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedState && selectedState !== 'all') params.append('state', selectedState);
      if (selectedDistrict && selectedDistrict !== 'all') params.append('district', selectedDistrict);
      if (selectedCommodity && selectedCommodity !== 'all') params.append('commodity', selectedCommodity);
      params.append('limit', '50');
      
      const response = await fetch(`/api/mandi-prices?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch mandi prices');
      }
      
      const data = await response.json();
      setPrices(data.prices || []);
      
      if (!data.prices || data.prices.length === 0) {
        setError('No price data found for selected filters');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mandi prices');
      setPrices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load with user's location or default
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const locationData = localStorage.getItem('cropwise-selected-location');
        if (locationData) {
          const parsed = JSON.parse(locationData);
          if (parsed.stateName) {
            setSelectedState(parsed.stateName);
            return; // Don't fetch here, let the filter effect handle it
          }
        }
      } catch (e) {
        console.error('Failed to load location:', e);
      }
      
      // Fetch initial data only if no location was set
      fetchMandiPrices();
    };
    
    loadInitialData();
  }, []);

  // Auto-apply filters whenever they change
  useEffect(() => {
    fetchMandiPrices();
  }, [selectedState, selectedDistrict, selectedCommodity]);

  // Filter prices based on search query
  const filteredPrices = prices.filter(price => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      price.commodity.toLowerCase().includes(query) ||
      price.market.toLowerCase().includes(query) ||
      price.variety.toLowerCase().includes(query) ||
      price.district.toLowerCase().includes(query)
    );
  });

  // Display limited or all records
  const displayedPrices = isExpanded ? filteredPrices : filteredPrices.slice(0, 5);

  const handleClearFilters = () => {
    setSelectedState('all');
    setSelectedDistrict('all');
    setSelectedCommodity('all');
    setSearchQuery('');
  };

  const hasActiveFilters = (selectedState !== 'all') || (selectedDistrict !== 'all') || (selectedCommodity !== 'all') || searchQuery;

  // Show component if loading, has data, or has active filters
  const shouldShowComponent = isLoading || filteredPrices.length > 0 || hasActiveFilters;

  // Format date
  const formatDate = (dateString: string) => {
    try {
      // Handle DD/MM/YYYY or DD-MM-YYYY format from Indian API
      const parts = dateString.split(/[-/]/);
      if (parts.length === 3) {
        // Assuming format is DD-MM-YYYY or DD/MM/YYYY
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        // Create date as YYYY-MM-DD for proper parsing
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return new Date(isoDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
      // Fallback to default parsing
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Calculate price trend
  const getPriceTrend = (price: PriceRecord) => {
    const diff = price.maxPrice - price.minPrice;
    const percentage = ((diff / price.minPrice) * 100).toFixed(1);
    return { diff, percentage };
  };

  // Only hide component on initial load when no filters are active and no data
  if (!shouldShowComponent && !hasActiveFilters) {
    return null;
  }

  return (
    <Card className={`${className} bg-card border-emerald-200/70`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-emerald-800">
            📊 {t('marketPrice')} - Live Mandi Rates
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 px-2 text-xs"
                title="Clear all filters"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMandiPrices}
              className="h-7 px-2"
              disabled={isLoading}
              title="Refresh prices"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select Commodity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commodities</SelectItem>
              {commodities.map((commodity) => (
                <SelectItem key={commodity} value={commodity}>
                  {commodity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-7 text-xs"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMandiPrices}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : displayedPrices.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <p>No mandi prices found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Loading overlay for subsequent loads */}
            {isLoading && prices.length > 0 && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm text-emerald-600">Loading...</span>
                </div>
              </div>
            )}
            
            {/* Table for desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-emerald-200">
                    <th className="text-left py-2 px-2 font-semibold text-emerald-800">Commodity</th>
                    <th className="text-left py-2 px-2 font-semibold text-emerald-800">Market</th>
                    <th className="text-left py-2 px-2 font-semibold text-emerald-800">District</th>
                    <th className="text-left py-2 px-2 font-semibold text-emerald-800">Variety</th>
                    <th className="text-right py-2 px-2 font-semibold text-emerald-800">Min Price</th>
                    <th className="text-right py-2 px-2 font-semibold text-emerald-800">Max Price</th>
                    <th className="text-right py-2 px-2 font-semibold text-emerald-800">Modal Price</th>
                    <th className="text-center py-2 px-2 font-semibold text-emerald-800">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPrices.map((price, index) => {
                    const trend = getPriceTrend(price);
                    return (
                      <tr
                        key={index}
                        className="border-b border-emerald-100 hover:bg-emerald-50 transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900">{price.commodity}</td>
                        <td className="py-2 px-2 text-gray-700">{price.market}</td>
                        <td className="py-2 px-2 text-gray-600">{price.district}</td>
                        <td className="py-2 px-2 text-gray-600">{price.variety || '-'}</td>
                        <td className="py-2 px-2 text-right text-gray-700">₹{price.minPrice}</td>
                        <td className="py-2 px-2 text-right text-gray-700">₹{price.maxPrice}</td>
                        <td className="py-2 px-2 text-right">
                          <span className="font-semibold text-emerald-700">₹{price.modalPrice}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-gray-500 text-[10px]">
                          {formatDate(price.arrivalDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards for mobile */}
            <div className="md:hidden space-y-2">
              {displayedPrices.map((price, index) => {
                const trend = getPriceTrend(price);
                return (
                  <div
                    key={index}
                    className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/30 hover:bg-emerald-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900">{price.commodity}</h4>
                        <p className="text-xs text-gray-600">{price.variety || 'Standard'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-700">₹{price.modalPrice}</div>
                        <div className="text-[10px] text-gray-500">/quintal</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Market:</span>
                        <span className="ml-1 text-gray-700">{price.market}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">District:</span>
                        <span className="ml-1 text-gray-700">{price.district}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Min:</span>
                        <span className="ml-1 text-gray-700">₹{price.minPrice}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Max:</span>
                        <span className="ml-1 text-gray-700">₹{price.maxPrice}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200">
                      <span className="text-[10px] text-gray-500">
                        {formatDate(price.arrivalDate)}
                      </span>
                      {trend.diff > 0 && (
                        <span className="text-[10px] text-emerald-600 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                          ±{trend.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more/less button */}
            {filteredPrices.length > 5 && (
              <div className="mt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs"
                >
                  {isExpanded ? 'Show Less' : `Show More (${filteredPrices.length - 5} more)`}
                </Button>
              </div>
            )}

            {/* Summary */}
            {filteredPrices.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-200 text-[11px] text-gray-600 text-center">
                Showing {displayedPrices.length} of {filteredPrices.length} records
                {selectedState !== 'all' && ` in ${selectedState}`}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
