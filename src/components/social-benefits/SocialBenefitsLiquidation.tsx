import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, X, Calculator, History } from 'lucide-react';
import { BenefitCalculatorBase } from './BenefitCalculatorBase';
import { LiquidationHistoryPanel } from './LiquidationHistoryPanel';
import { PendingLiquidationsPanel } from './PendingLiquidationsPanel';
import { PendingPeriod } from '@/services/SocialBenefitsLiquidationService';
import type { BenefitType } from '@/types/social-benefits';

interface SelectedBenefitState {
  benefitType: BenefitType;
  title: string;
  description: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
}

export const SocialBenefitsLiquidation = () => {
  const [selectedBenefit, setSelectedBenefit] = useState<SelectedBenefitState | null>(null);
  const [activeTab, setActiveTab] = useState<'liquidar' | 'historial'>('liquidar');

  const handleSelectPeriod = (period: PendingPeriod) => {
    const titles: Record<string, string> = {
      prima: 'Liquidar Prima de Servicios',
      cesantias: 'Liquidar Cesantías',
      intereses_cesantias: 'Liquidar Intereses de Cesantías'
    };
    
    const descriptions: Record<string, string> = {
      prima: 'Calcule y registre la prima semestral para sus empleados',
      cesantias: 'Calcule las cesantías del período para sus empleados',
      intereses_cesantias: 'Calcule los intereses del 12% anual sobre cesantías'
    };

    setSelectedBenefit({
      benefitType: period.benefitType as BenefitType,
      title: titles[period.benefitType] || 'Liquidar Prestación',
      description: descriptions[period.benefitType] || '',
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      periodLabel: period.periodLabel
    });
  };

  // Vista del calculador de beneficio seleccionado
  if (selectedBenefit) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setSelectedBenefit(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a prestaciones
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedBenefit(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <BenefitCalculatorBase
              benefitType={selectedBenefit.benefitType}
              title={selectedBenefit.title}
              description={selectedBenefit.description}
              initialPeriodStart={selectedBenefit.periodStart}
              initialPeriodEnd={selectedBenefit.periodEnd}
              initialPeriodLabel={selectedBenefit.periodLabel}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Prestaciones Sociales</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Liquide y consulte el historial de prestaciones sociales
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'liquidar' | 'historial')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="liquidar" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Liquidar
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liquidar" className="mt-6">
          <PendingLiquidationsPanel onSelectPeriod={handleSelectPeriod} />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <LiquidationHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
