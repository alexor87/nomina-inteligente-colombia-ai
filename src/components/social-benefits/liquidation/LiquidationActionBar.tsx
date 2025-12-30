import React, { useState } from 'react';
import { Search, Download, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmLiquidationModal } from './ConfirmLiquidationModal';

interface LiquidationActionBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDownload: () => void;
  onLiquidate: () => Promise<void>;
  isLiquidating: boolean;
  isLiquidated: boolean;
  benefitLabel: string;
  employeesCount: number;
  totalAmount: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const LiquidationActionBar: React.FC<LiquidationActionBarProps> = ({
  searchTerm,
  onSearchChange,
  onDownload,
  onLiquidate,
  isLiquidating,
  isLiquidated,
  benefitLabel,
  employeesCount,
  totalAmount,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmLiquidation = async () => {
    await onLiquidate();
    setShowConfirmModal(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        {/* Left side - Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar resumen
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Descarga un resumen en Excel del cálculo de esta prestación social, los valores pagados y por pagar para cada persona.</p>
            </TooltipContent>
          </Tooltip>

          {isLiquidated ? (
            <Button variant="secondary" size="sm" disabled className="gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Liquidado
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isLiquidating || employeesCount === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLiquidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Liquidando...
                    </>
                  ) : (
                    `Liquidar ${benefitLabel.toLowerCase()}`
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Al liquidar verás reflejada la {benefitLabel.toLowerCase()} en el resumen de nómina, las colillas de pago y el archivo para pago en banco.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <ConfirmLiquidationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmLiquidation}
        isProcessing={isLiquidating}
        benefitLabel={benefitLabel}
        employeesCount={employeesCount}
        totalAmount={totalAmount}
      />
    </>
  );
};
