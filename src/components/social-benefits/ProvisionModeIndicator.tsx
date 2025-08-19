
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Settings, CheckCircle } from 'lucide-react';
import { MonthlyConsolidationButton } from './MonthlyConsolidationButton';

interface ProvisionModeIndicatorProps {
  provisionMode: 'on_liquidation' | 'monthly_consolidation';
  loadingSettings: boolean;
  onConsolidated: () => void;
}

const PROVISION_MODE_CONFIG = {
  on_liquidation: {
    label: 'Modo: Automático al Liquidar',
    bannerTitle: 'Provisiones Automáticas Activas',
    bannerDescription: 'Las provisiones se calculan y registran automáticamente cada vez que se liquida un período de nómina. No requiere acción adicional.',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
  },
  monthly_consolidation: {
    label: 'Modo: Consolidado Mensual',
    bannerTitle: 'Modo de Consolidado Mensual Activo',
    bannerDescription: 'Las provisiones no se calculan automáticamente al liquidar períodos. Use el botón "Consolidar Mes" para procesar todos los períodos cerrados del mes actual.',
    icon: AlertCircle,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
};

export const ProvisionModeIndicator: React.FC<ProvisionModeIndicatorProps> = ({
  provisionMode,
  loadingSettings,
  onConsolidated,
}) => {
  if (loadingSettings) {
    return null;
  }

  const config = PROVISION_MODE_CONFIG[provisionMode];
  const Icon = config.icon;

  return (
    <>
      {/* Mode indicator and button */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-md border ${config.bgColor} ${config.borderColor}`}>
          <Settings className={`h-4 w-4 ${config.iconColor}`} />
          <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
        </div>
        {provisionMode === 'monthly_consolidation' && (
          <MonthlyConsolidationButton onConsolidated={onConsolidated} />
        )}
      </div>

      {/* Explanation banner */}
      <Card className={`${config.borderColor} ${config.bgColor}`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
            <div>
              <h3 className={`font-medium ${config.textColor}`}>{config.bannerTitle}</h3>
              <p className={`${config.textColor} text-sm mt-1`}>{config.bannerDescription}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
