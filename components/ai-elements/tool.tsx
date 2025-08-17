'use client';

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ToolUIPart } from 'ai';
import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'not-prose mb-4 w-full max-w-full rounded-md border overflow-hidden break-words min-w-0',
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart['state']) => {
  const labels = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'output-available': 'Completed',
    'output-error': 'Error',
  } as const;

  const icons = {
    'input-streaming': <CircleIcon className="size-4" />,
    'input-available': <ClockIcon className="size-4 animate-pulse" />,
    'output-available': <CheckCircleIcon className="size-4 text-green-600" />,
    'output-error': <XCircleIcon className="size-4 text-red-600" />,
  } as const;

  return (
    <Badge className="rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-2 sm:gap-4 p-3 hover:bg-muted/50 transition-colors',
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <WrenchIcon className="size-4 text-muted-foreground flex-shrink-0" />
      <span className="font-medium text-sm truncate">{type}</span>
      {getStatusBadge(state)}
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 flex-shrink-0" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'text-popover-foreground outline-none overflow-hidden break-words min-w-0 max-w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2',
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden p-3 sm:p-4 break-words min-w-0', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50 overflow-hidden max-w-full min-w-0">
      <div className="max-h-60 overflow-auto">
        <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
      </div>
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ReactNode;
  errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn('space-y-2 p-3 sm:p-4 break-words min-w-0', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'overflow-auto rounded-md text-xs break-words max-w-full min-w-0 max-h-80',
          '[&_table]:w-full [&_table]:table-auto [&_table]:overflow-x-auto [&_table]:break-words [&_table]:min-w-0',
          '[&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full [&_pre]:min-w-0',
          '[&_code]:break-words [&_code]:whitespace-pre-wrap [&_code]:max-w-full [&_code]:overflow-hidden [&_code]:min-w-0',
          '[&>*]:break-words [&>*]:max-w-full [&>*]:overflow-hidden [&>*]:min-w-0',
          '[&_div]:break-words [&_div]:max-w-full [&_div]:overflow-hidden [&_div]:min-w-0',
          '[&_span]:break-words [&_span]:max-w-full [&_span]:overflow-hidden [&_span]:min-w-0',
          errorText
            ? 'bg-destructive/10 text-destructive p-3'
            : 'bg-muted/50 text-foreground p-3',
        )}
      >
        {errorText && (
          <div className="whitespace-pre-wrap break-words max-w-full overflow-hidden min-w-0">{errorText}</div>
        )}
        {output && (
          <div className="overflow-hidden break-words max-w-full min-w-0 [&>*]:max-w-full [&>*]:overflow-hidden [&>*]:break-words [&>*]:min-w-0">
            {output}
          </div>
        )}
      </div>
    </div>
  );
};
