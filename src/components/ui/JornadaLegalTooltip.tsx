
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Clock, Info } from 'lucide-react';
import { getJornadaLegal, getProximoCambioJornada } from '@/utils/jornadaLegal';

interface JornadaLegalTooltipProps {
  fecha?: Date;
  children?: React.ReactNode;
  showBadge?: boolean;
}

export const JornadaLegalTooltip: React.FC<JornadaLegalTooltipProps> = ({
  fecha = new Date(),
  children,
  showBadge = true
}) => {
  const jornadaActual = getJornadaLegal(fecha);
  const proximoCambio = getProximoCambioJornada(fecha);

  const trigger = children || (
    showBadge ? (
      <Badge variant="outline" className="flex items-center space-x-1 text-xs">
        <Clock className="h-3 w-3" />
        <span>{jornadaActual.horasSemanales}h/sem</span>
      </Badge>
    ) : (
      <Info className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-help" />
    )
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3">
          <div className="space-y-2">
            <div className="font-semibold text-sm">
              Jornada Legal Vigente
            </div>
            
            <div className="text-xs space-y-1">
              <div>
                <strong>Horas semanales:</strong> {jornadaActual.horasSemanales}h
              </div>
              <div>
                <strong>Horas mensuales:</strong> {Math.round(jornadaActual.horasMensuales)}h
              </div>
              <div>
                <strong>Ley aplicable:</strong> {jornadaActual.ley}
              </div>
              <div>
                <strong>Vigente desde:</strong> {jornadaActual.fechaVigencia.toLocaleDateString('es-CO')}
              </div>
            </div>

            <div className="text-xs text-gray-600 border-t pt-2">
              {jornadaActual.descripcion}
            </div>

            {proximoCambio && (
              <div className="text-xs text-blue-600 border-t pt-2">
                <div className="font-medium">Próximo cambio:</div>
                <div>
                  {proximoCambio.horasSemanales}h semanales desde el{' '}
                  {proximoCambio.fechaVigencia.toLocaleDateString('es-CO')}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
