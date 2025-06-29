
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, Clock, Info } from 'lucide-react';
import { getJornadaLegal, getHourlyDivisor } from '@/utils/jornadaLegal';
import { formatCurrency } from '@/lib/utils';

interface PayrollCalculationInfoProps {
  fecha?: Date;
  salarioBase?: number;
  showDetails?: boolean;
  className?: string;
}

export const PayrollCalculationInfo: React.FC<PayrollCalculationInfoProps> = ({
  fecha = new Date(),
  salarioBase,
  showDetails = true,
  className = ''
}) => {
  const jornadaLegal = getJornadaLegal(fecha);
  const divisorHorario = getHourlyDivisor(fecha);
  const valorHoraOrdinaria = salarioBase ? salarioBase / divisorHorario : 0;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showDetails && (
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1 text-xs">
            <Clock className="h-3 w-3" />
            <span>{jornadaLegal.horasSemanales}h/sem</span>
          </Badge>
          
          {salarioBase && (
            <Badge variant="outline" className="flex items-center space-x-1 text-xs">
              <Calculator className="h-3 w-3" />
              <span>H.Ord: {formatCurrency(Math.round(valorHoraOrdinaria))}</span>
            </Badge>
          )}
        </div>
      )}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-3">
            <div className="space-y-2">
              <div className="font-semibold text-sm">
                Información de Cálculo
              </div>
              
              <div className="text-xs space-y-1">
                <div>
                  <strong>Jornada Legal:</strong> {jornadaLegal.horasSemanales}h semanales
                </div>
                <div>
                  <strong>Divisor Horario:</strong> {divisorHorario}h mensuales
                </div>
                <div>
                  <strong>Ley Aplicable:</strong> {jornadaLegal.ley}
                </div>
                {salarioBase && (
                  <div>
                    <strong>Valor Hora Ordinaria:</strong> {formatCurrency(Math.round(valorHoraOrdinaria))}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-600 border-t pt-2">
                Los cálculos de horas extra se realizan según la jornada legal vigente para esta fecha.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
