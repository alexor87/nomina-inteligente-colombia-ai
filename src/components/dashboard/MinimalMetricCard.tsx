
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MinimalMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
}

export const MinimalMetricCard: React.FC<MinimalMetricCardProps> = ({
  title,
  value,
  change,
  subtitle
}) => {
  return (
    <Card className="border-border/50 shadow-none hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-semibold text-foreground">{value}</p>
          
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            
            {change !== undefined && (
              <div className={`flex items-center space-x-1 text-xs ${
                change >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="font-medium">
                  {change >= 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
