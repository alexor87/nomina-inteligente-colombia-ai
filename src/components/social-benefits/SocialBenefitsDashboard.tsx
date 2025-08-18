
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CesantiasCalculator } from './CesantiasCalculator';
import { PrimaCalculator } from './PrimaCalculator';
import { InteresesCalculator } from './InteresesCalculator';
import { SocialBenefitsHistory } from './SocialBenefitsHistory';
import { SocialBenefitsError } from './SocialBenefitsError';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { Calculator, History, TrendingUp, Percent } from 'lucide-react';

export const SocialBenefitsDashboard = () => {
  const [activeTab, setActiveTab] = useState('cesantias');
  const { error, isLoading } = useEmployeeData();

  console.log('🏢 SocialBenefitsDashboard - Estado:', {
    activeTab,
    hasError: !!error,
    isLoading,
    errorMessage: error
  });

  // Si hay error crítico en la carga inicial, mostrar error
  if (error && !isLoading) {
    return <SocialBenefitsError error={error} />;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cesantias" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Cesantías
          </TabsTrigger>
          <TabsTrigger value="prima" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Prima
          </TabsTrigger>
          <TabsTrigger value="intereses" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Intereses
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cesantias" className="mt-6">
          <CesantiasCalculator />
        </TabsContent>

        <TabsContent value="prima" className="mt-6">
          <PrimaCalculator />
        </TabsContent>

        <TabsContent value="intereses" className="mt-6">
          <InteresesCalculator />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <SocialBenefitsHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};
