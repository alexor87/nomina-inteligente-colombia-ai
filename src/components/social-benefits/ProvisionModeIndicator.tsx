
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Settings } from 'lucide-react';
import { MonthlyConsolidationButton } from './MonthlyConsolidationButton';

interface ProvisionModeIndicatorProps {
  provisionMode: 'on_liquidation' | 'monthly_consolidation';
  loadingSettings: boolean;
  onConsolidated: () => void;
}

const PROVISION_MODE_CONFIG = {
  monthly_consolidation: {
    label: 'Modo: Consolidado Mensual',
    bannerTitle: 'Modo de Consolidado Mensual Activo',
    bannerDescription: 'Las provisiones no se calculan automáticamente al liquidar períodos. Use el botón "Consolidar Mes" para procesar todos los períodos cerrados del mes actual.',
  },
};

export const ProvisionModeIndicator: React.FC<ProvisionModeIndicatorProps> = ({
  provisionMode,
  loadingSettings,
  onConsolidated,
}) => {
  if (loadingSettings || provisionMode !== 'monthly_consolidation') {
    return null;
  }

  const config = PROVISION_MODE_CONFIG.monthly_consolidation;

  return (
    <>
      {/* Mode indicator and button */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md border border-blue-200">
          <Settings className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">{config.label}</span>
        </div>
        <MonthlyConsolidationButton onConsolidated={onConsolidated} />
      </div>

      {/* Explanation banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">{config.bannerTitle}</h3>
              <p className="text-blue-700 text-sm mt-1">{config.bannerDescription}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
