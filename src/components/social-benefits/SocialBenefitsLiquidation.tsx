import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Package, Percent, Info, ArrowLeft, X, Calculator, History } from 'lucide-react';
import { BenefitCalculatorBase } from './BenefitCalculatorBase';
import { LiquidationHistoryPanel } from './LiquidationHistoryPanel';

type BenefitOption = 'prima' | 'cesantias' | 'intereses' | null;

const benefitCards = [
  {
    id: 'prima' as const,
    title: 'Prima de Servicios',
    description: 'Pago semestral obligatorio equivalente a 15 días de salario',
    icon: Gift,
    legalDate: 'Pago: 30 Jun / 20 Dic',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'cesantias' as const,
    title: 'Cesantías',
    description: 'Provisión anual para protección del trabajador',
    icon: Package,
    legalDate: 'Consignación: 14 Feb',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200',
  },
  {
    id: 'intereses' as const,
    title: 'Intereses de Cesantías',
    description: '12% anual sobre cesantías acumuladas',
    icon: Percent,
    legalDate: 'Pago: 31 Ene',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200',
  },
];

export const SocialBenefitsLiquidation = () => {
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitOption>(null);
  const [activeTab, setActiveTab] = useState<'liquidar' | 'historial'>('liquidar');

  const getBenefitConfig = (benefit: BenefitOption) => {
    switch (benefit) {
      case 'prima':
        return {
          benefitType: 'prima' as const,
          title: 'Liquidar Prima de Servicios',
          description: 'Calcule y registre la prima semestral para sus empleados',
        };
      case 'cesantias':
        return {
          benefitType: 'cesantias' as const,
          title: 'Liquidar Cesantías',
          description: 'Calcule las cesantías del período para sus empleados',
        };
      case 'intereses':
        return {
          benefitType: 'intereses_cesantias' as const,
          title: 'Liquidar Intereses de Cesantías',
          description: 'Calcule los intereses del 12% anual sobre cesantías',
        };
      default:
        return null;
    }
  };

  // Vista del calculador de beneficio seleccionado
  if (selectedBenefit) {
    const config = getBenefitConfig(selectedBenefit);
    if (!config) return null;

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
              benefitType={config.benefitType}
              title={config.title}
              description={config.description}
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

        <TabsContent value="liquidar" className="mt-6 space-y-6">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Flexibilidad legal:</strong> Puede liquidar prestaciones en cualquier momento del año, 
              no solo en las fechas límite legales. El sistema calculará el valor proporcional al período seleccionado.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {benefitCards.map((card) => (
              <Card
                key={card.id}
                className={`cursor-pointer transition-all duration-200 ${card.bgColor} ${card.borderColor} border-2`}
                onClick={() => setSelectedBenefit(card.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white ${card.color}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    {card.description}
                  </CardDescription>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{card.legalDate}</span>
                    <Button variant="ghost" size="sm" className={card.color}>
                      Liquidar →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <LiquidationHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
