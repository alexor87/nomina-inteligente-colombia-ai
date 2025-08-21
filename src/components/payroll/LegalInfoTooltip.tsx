
import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LegalInfoTooltipProps {
  type: 'transport' | 'incapacity' | 'net_pay';
  data?: any;
}

export const LegalInfoTooltip: React.FC<LegalInfoTooltipProps> = ({ type, data }) => {
  const getLegalInfo = () => {
    switch (type) {
      case 'transport':
        return {
          title: 'Auxilio de Transporte - Base Legal',
          content: (
            <div className="space-y-2 text-sm">
              <p><strong>Ley 15 de 1959, Art. 7:</strong> Auxilio de transporte para trabajadores con salario hasta 2 SMMLV</p>
              <p><strong>Valor 2025:</strong> $200.000 mensuales</p>
              <p><strong>Límite:</strong> Salarios hasta $2.847.000 (2 × $1.423.500)</p>
              <p><strong>Cálculo:</strong> Proporcional a días efectivamente trabajados</p>
              {data?.incapacityDays > 0 && (
                <p className="text-amber-600"><strong>Nota:</strong> Días de incapacidad no generan auxilio de transporte</p>
              )}
            </div>
          )
        };
      
      case 'incapacity':
        return {
          title: 'Incapacidades - Base Legal',
          content: (
            <div className="space-y-2 text-sm">
              <p><strong>CST Art. 227:</strong> Sustitución del salario por subsidio de incapacidad</p>
              <p><strong>Decreto 780/2016:</strong> Primeros 2 días a cargo del empleador (100%)</p>
              <p><strong>Resto de días:</strong> EPS paga el 66.67% con piso de 1 SMLDV</p>
              <p><strong>SMLDV 2025:</strong> $47.450 (SMLV ÷ 30)</p>
              <p className="text-red-600"><strong>Importante:</strong> Los días de incapacidad NO generan salario ordinario</p>
            </div>
          )
        };
      
      case 'net_pay':
        return {
          title: 'Neto a Pagar - Fórmula Legal',
          content: (
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> Neto = Total Devengado - Total Deducciones</p>
              <p><strong>Devengado incluye:</strong></p>
              <ul className="list-disc ml-4">
                <li>Salario ordinario (días efectivos)</li>
                <li>Subsidio de incapacidad</li>
                <li>Horas extra y recargos</li>
                <li>Auxilio de transporte</li>
              </ul>
              <p><strong>Deducciones:</strong> Salud (4%) + Pensión (4%)</p>
            </div>
          )
        };
      
      default:
        return { title: '', content: null };
    }
  };

  const info = getLegalInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 text-blue-600 hover:text-blue-800">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-3 bg-white border shadow-lg">
          <div>
            <h4 className="font-semibold mb-2">{info.title}</h4>
            {info.content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
