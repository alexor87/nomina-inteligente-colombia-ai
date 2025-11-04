import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';

interface PendingChangeDisplayProps {
  label: string;
  currentValue: number;
  newValue: number;
  changeType: 'positive' | 'neutral' | 'info';
  tooltip?: string;
  showArrow?: boolean;
}

export const PendingChangeDisplay = ({
  label,
  currentValue,
  newValue,
  changeType,
  tooltip,
  showArrow = true
}: PendingChangeDisplayProps) => {
  const difference = newValue - currentValue;
  const isIncrease = difference > 0;
  
  // Define semantic colors based on changeType
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-success';
      case 'neutral':
        return 'text-muted-foreground';
      case 'info':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeVariant = () => {
    switch (changeType) {
      case 'positive':
        return 'bg-success/10 text-success border-success/20';
      case 'neutral':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'info':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const content = (
    <div className="space-y-1.5 text-right">
      <div className="text-xs text-muted-foreground font-normal">
        Actual: {formatCurrency(currentValue)}
      </div>
      
      {showArrow && (
        <div className="flex items-center justify-end gap-1">
          <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
        </div>
      )}
      
      <div className={`font-semibold ${getChangeColor()}`}>
        Nuevo: {formatCurrency(newValue)}
      </div>
      
      <Badge 
        variant="outline" 
        className={`text-xs font-medium border ${getBadgeVariant()}`}
      >
        {isIncrease ? '+' : ''}{formatCurrency(difference)}
      </Badge>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {content}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[250px]">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};
