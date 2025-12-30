import React from 'react';
import { Gift, Wallet, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LiquidationHeroProps {
  benefitType: 'prima' | 'cesantias' | 'intereses_cesantias';
  benefitLabel: string;
  periodLabel: string;
  description: string;
}

const BENEFIT_ICONS = {
  prima: Gift,
  cesantias: Wallet,
  intereses_cesantias: Percent,
};

const BENEFIT_COLORS = {
  prima: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  cesantias: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  intereses_cesantias: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
};

export const LiquidationHero: React.FC<LiquidationHeroProps> = ({
  benefitType,
  benefitLabel,
  periodLabel,
  description,
}) => {
  const Icon = BENEFIT_ICONS[benefitType] || Gift;
  const colorClass = BENEFIT_COLORS[benefitType] || BENEFIT_COLORS.prima;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row items-start gap-6 p-6">
          {/* Icon container */}
          <div className={`p-4 rounded-2xl ${colorClass}`}>
            <Icon className="h-12 w-12" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {benefitLabel}
              </h1>
              <span className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm font-medium">
                {periodLabel}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
