
import React, { useMemo } from 'react';
import { Info, Calendar, Calculator, CheckCircle, XCircle } from 'lucide-react';
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
  
  // ✅ Optimización: Usar useMemo para cálculos pesados
  const calculationData = useMemo(() => {
    // Expected calculations usando fórmula Aleluya
    const divisorAleluya = 30 * 7.333; // 219.99
    
    const expectedValue15July = Math.round((salario * 0.80 * horasNum) / divisorAleluya); // Factor dominical 0.80
    const expectedValue1July = Math.round((salario * 0.75 * horasNum) / divisorAleluya); // Factor dominical 0.75
    
    const getExpectedValue = () => {
      if (fechaString === '2025-07-15') return expectedValue15July;
      if (fechaString === '2025-07-01') return expectedValue1July;
      if (fechaString >= '2025-07-01') return expectedValue15July; // 0.80 factor desde julio 1
      return expectedValue1July; // 0.75 factor antes de julio 1
    };
    
    const getExpectedFactor = () => {
      if (fechaString >= '2025-07-01') return 0.80; // Factor total dominical desde julio 1
      return 0.75; // Factor total dominical antes de julio 1
    };

    const currentExpected = getExpectedValue();
    const currentFactor = getExpectedFactor();
    const isCorrect = Math.abs(valorCalculado - currentExpected) < 50;

    return {
      expectedValue15July,
      expectedValue1July,
      currentExpected,
      currentFactor,
      isCorrect,
      divisorAleluya
    };
  }, [salario, horasNum, fechaString, valorCalculado]);

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

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border-2 border-blue-300 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-blue-800">🚀 DEBUG ALELUYA</span>
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
          <p>📊 Factor esperado: {calculationData.currentFactor}</p>
          <p>🎯 Valor esperado: {formatCurrency(calculationData.currentExpected)}</p>
        </div>
        
        <div className={`p-2 rounded flex items-center gap-2 ${
          calculationData.isCorrect ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {calculationData.isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <div>
            <p className="font-bold">Resultado: {formatCurrency(valorCalculado)}</p>
            <p className="text-xs">
              {calculationData.isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}
            </p>
          </div>
        </div>
        
        <div className="bg-yellow-100 p-2 rounded text-yellow-800">
          <p className="font-bold">🎯 FÓRMULA ALELUYA</p>
          <p className="text-xs">
            ({formatCurrency(salario)} × {calculationData.currentFactor} × {horasNum}h) ÷ (30 × 7.333)
          </p>
          <p className="text-xs">
            = {formatCurrency(calculationData.currentExpected)}
          </p>
        </div>

        {/* Test buttons optimizados */}
        <div className="space-y-1">
          <p className="font-bold text-blue-800 text-xs">🧪 PROBAR FECHAS:</p>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={testDate1July}
              className="text-xs px-2 py-1 h-auto"
            >
              1 Jul (0.75)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={testDate15July}
              className="text-xs px-2 py-1 h-auto"
            >
              15 Jul (0.80)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
