import React from 'react';
import { Info, Calendar, Calculator, CheckCircle, XCircle, Settings } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NovedadDebugPanelProps {
  fecha: Date;
  horas: string;
  salario: number;
  valorCalculado: number;
  validationPassed: boolean | null;
  onDateChange?: (newDate: Date) => void;
}

export const NovedadDebugPanel: React.FC<NovedadDebugPanelProps> = ({
  fecha,
  horas,
  salario,
  valorCalculado,
  validationPassed,
  onDateChange
}) => {
  const fechaString = fecha.toISOString().split('T')[0];
  const horasNum = parseFloat(horas || '1');
  
  // Cálculos esperados
  const expectedValue15July = Math.round((salario / 220) * 1.25 * horasNum);
  const expectedValue1July = Math.round((salario / 230) * 1.25 * horasNum);
  
  const getExpectedValue = () => {
    if (fechaString === '2025-07-15') return expectedValue15July;
    if (fechaString === '2025-07-01') return expectedValue1July;
    if (fechaString >= '2025-07-15') return expectedValue15July; // 220h para fechas >= 15 julio
    return expectedValue1July; // 230h para fechas < 15 julio
  };
  
  const getExpectedHours = () => {
    if (fechaString === '2025-07-15') return 220;
    if (fechaString === '2025-07-01') return 230;
    if (fechaString >= '2025-07-15') return 220;
    return 230;
  };

  const testDate1July = () => {
    if (onDateChange) {
      onDateChange(new Date('2025-07-01'));
    }
  };

  const testDate15July = () => {
    if (onDateChange) {
      onDateChange(new Date('2025-07-15'));
    }
  };

  const currentExpected = getExpectedValue();
  const isCorrect = Math.abs(valorCalculado - currentExpected) < 50;

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
          isCorrect ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <div>
            <p className="font-bold">Resultado: {formatCurrency(valorCalculado)}</p>
            <p className="text-xs">
              {isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}
            </p>
          </div>
        </div>
        
        <div className="bg-yellow-100 p-2 rounded text-yellow-800">
          <p className="font-bold">🎯 FÓRMULA ACTUAL</p>
          <p className="text-xs">
            {formatCurrency(salario)} ÷ {getExpectedHours()}h × 1.25 × {horasNum}h
          </p>
          <p className="text-xs">
            = {formatCurrency(getExpectedValue())}
          </p>
        </div>

        {/* Botones de prueba */}
        <div className="space-y-1">
          <p className="font-bold text-blue-800 text-xs">🧪 PROBAR FECHAS:</p>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={testDate1July}
              className="text-xs px-2 py-1 h-auto"
            >
              1 Jul (230h)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={testDate15July}
              className="text-xs px-2 py-1 h-auto"
            >
              15 Jul (220h)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};