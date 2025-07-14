import React from 'react';
import { Info, Calendar, Calculator, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadDebugPanelProps {
  fecha: Date;
  horas: string;
  salario: number;
  valorCalculado: number;
  validationPassed: boolean | null;
}

export const NovedadDebugPanel: React.FC<NovedadDebugPanelProps> = ({
  fecha,
  horas,
  salario,
  valorCalculado,
  validationPassed
}) => {
  const fechaString = fecha.toISOString().split('T')[0];
  const horasNum = parseFloat(horas || '1');
  
  // Cálculos esperados
  const expectedValue15July = Math.round((salario / 220) * 1.25 * horasNum);
  const expectedValue1July = Math.round((salario / 230) * 1.25 * horasNum);
  
  const getExpectedValue = () => {
    if (fechaString === '2025-07-15') return expectedValue15July;
    if (fechaString === '2025-07-01') return expectedValue1July;
    return 0;
  };
  
  const getExpectedHours = () => {
    if (fechaString === '2025-07-15') return 220;
    if (fechaString === '2025-07-01') return 230;
    return 220;
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border-2 border-blue-300 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-blue-800">🚀 ULTRA-KISS DEBUG</span>
      </div>
      
      <div className="space-y-2 text-sm font-mono">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>Fecha: {fechaString}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          <span>Horas: {horasNum}</span>
        </div>
        
        <div className="bg-gray-100 p-2 rounded">
          <p>💰 Salario: {formatCurrency(salario)}</p>
          <p>⏰ Horas esperadas: {getExpectedHours()}h/mes</p>
          <p>🎯 Valor esperado: {formatCurrency(getExpectedValue())}</p>
        </div>
        
        <div className={`p-2 rounded flex items-center gap-2 ${
          validationPassed === true ? 'bg-green-100 text-green-800' :
          validationPassed === false ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {validationPassed === true && <CheckCircle className="h-4 w-4" />}
          {validationPassed === false && <XCircle className="h-4 w-4" />}
          <div>
            <p className="font-bold">Resultado: {formatCurrency(valorCalculado)}</p>
            <p className="text-xs">
              {validationPassed === true ? '✅ CORRECTO' :
               validationPassed === false ? '❌ INCORRECTO' :
               '⏳ CALCULANDO'}
            </p>
          </div>
        </div>
        
        {(fechaString === '2025-07-15' || fechaString === '2025-07-01') && (
          <div className="bg-yellow-100 p-2 rounded text-yellow-800">
            <p className="font-bold">🎯 FECHA CRÍTICA</p>
            <p className="text-xs">
              Fórmula: {formatCurrency(salario)} ÷ {getExpectedHours()}h × 1.25 × {horasNum}h
            </p>
            <p className="text-xs">
              = {formatCurrency(getExpectedValue())}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};