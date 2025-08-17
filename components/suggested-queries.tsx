import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
// import { Skeleton } from './ui/skeleton'; // Not currently used
import { RefreshCw, Sparkles, CornerDownRight } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface SuggestedQueriesProps {
  queries: string[];
  isLoading: boolean;
  error: string | null;
  onQuerySelect: (query: string) => void;
  onRefresh?: () => void;
  className?: string;
  isAgentResponding?: boolean; // New prop to indicate if agent is still responding
}

export const SuggestedQueries: React.FC<SuggestedQueriesProps> = ({
  queries,
  isLoading,
  // error, // Not currently used but kept for future error handling
  onQuerySelect,
  onRefresh,
  className = '',
  isAgentResponding = false,
}) => {
  const { t } = useTranslation();
  // Don't show anything while agent is responding
  if (isAgentResponding) {
    return null;
  }
  // Show loading state if loading and no queries yet
  if (isLoading && (!queries || queries.length === 0)) {
    return (
      <Card className={`${className} bg-card border-emerald-200/70`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
            <Sparkles className="w-4 h-4" />
            {t('suggestedFollowUps')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 mr-2" />
            <span className="text-sm text-emerald-600">Generating suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Hide everything until we have actual queries
  if (!queries || queries.length === 0) {
    return null;
  }

  return (
    <Card className={`${className} bg-card border-emerald-200/70`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
          <Sparkles className="w-4 h-4" />
          {t('suggestedFollowUps')}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-6 px-2 ml-auto"
              title="Refresh suggestions"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQuerySelect(query)}
            className="group w-full text-left text-[13px] px-2 py-1 rounded-md border border-emerald-300 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 flex items-start gap-2 transition-colors cursor-pointer"
          >
            <CornerDownRight className="h-4 w-4 text-emerald-500 mt-0.5" />
            <span className="flex-1 leading-snug text-emerald-800 group-hover:text-emerald-900">{query}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white group-hover:bg-emerald-700">{t('askButton')}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};
