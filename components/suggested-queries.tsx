import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
// import { Skeleton } from './ui/skeleton'; // Not currently used
import { RefreshCw, MessageSquare, Sparkles } from 'lucide-react';

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
  // isLoading, // Not currently used but kept for future loading states
  // error, // Not currently used but kept for future error handling
  onQuerySelect,
  onRefresh,
  className = '',
  isAgentResponding = false,
}) => {
  // Don't show anything while agent is responding
  if (isAgentResponding) {
    return null;
  }
  // Hide everything until we have actual queries
  if (!queries || queries.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Suggested Questions
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-6 px-2 ml-auto"
              title="Refresh suggestions"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {queries.map((query, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full text-left justify-start h-auto py-3 px-4 text-sm font-normal border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            onClick={() => onQuerySelect(query)}
          >
            <MessageSquare className="w-4 h-4 mr-2 text-gray-500 shrink-0" />
            <span className="text-gray-700">{query}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
