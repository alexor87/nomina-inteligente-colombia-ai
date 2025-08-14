
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { calculateDaysBetween } from '@/utils/dateUtils';
import { formatCurrency } from '@/lib/utils';

interface IncapacidadDebuggerProps {
  formData: {
    subtipo: string;
    fecha_inicio: string;
    fecha_fin: string;
    valor: number;
  };
  employeeSalary: number;
  calculatedDays: number;
  isLoading: boolean;
}

export const IncapacidadDebugger: React.FC<IncapacidadDebuggerProps> = ({
  formData,
  employeeSalary,
  calculatedDays,
  isLoading
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Bug className="h-4 w-4 mr-2" />
        Debug Incapacidad
      </Button>
    );
  }

  // Cálculo manual para verificar
  const valorHoraDiaria = employeeSalary / 30;
  let expectedValue = 0;
  
  if (formData.subtipo === 'laboral') {
    expectedValue = valorHoraDiaria * calculatedDays;
  } else if (formData.subtipo === 'general') {
    if (calculatedDays > 3) {
      expectedValue = valorHoraDiaria * (calculatedDays - 3) * 0.6667;
    }
  }

  const isConsistent = Math.abs(formData.valor - expectedValue) < 100; // Margen de 100 pesos

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 max-h-96 overflow-y-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Debug Incapacidad
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Estado de cálculo de días */}
        <div className="space-y-1">
          <div className="font-medium">Cálculo de Días:</div>
          <div className="flex items-center gap-2">
            {calculatedDays > 0 ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-red-600" />
            )}
            <span>Días calculados: {calculatedDays}</span>
          </div>
          <div className="text-gray-600">
            Rango: {formData.fecha_inicio || 'N/A'} - {formData.fecha_fin || 'N/A'}
          </div>
        </div>

        {/* Estado del backend */}
        <div className="space-y-1">
          <div className="font-medium">Backend:</div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Badge variant="secondary" className="bg-blue-100">Calculando...</Badge>
            ) : formData.valor > 0 ? (
              <Badge variant="secondary" className="bg-green-100">Calculado</Badge>
            ) : (
              <Badge variant="destructive">Sin valor</Badge>
            )}
          </div>
        </div>

        {/* Datos enviados */}
        <div className="space-y-1">
          <div className="font-medium">Datos Enviados:</div>
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div>Tipo: incapacidad</div>
            <div>Subtipo: {formData.subtipo}</div>
            <div>Salario: {formatCurrency(employeeSalary)}</div>
            <div>Días: {calculatedDays}</div>
          </div>
        </div>

        {/* Validación manual */}
        <div className="space-y-1">
          <div className="font-medium">Validación Manual:</div>
          <div className="bg-gray-50 p-2 rounded">
            <div>Valor esperado: {formatCurrency(expectedValue)}</div>
            <div>Valor recibido: {formatCurrency(formData.valor)}</div>
            <div className="flex items-center gap-2 mt-1">
              {isConsistent ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Consistente</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">Inconsistente</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Normativa aplicada */}
        <div className="space-y-1">
          <div className="font-medium">Normativa:</div>
          <div className="text-gray-600">
            {formData.subtipo === 'laboral' ? 
              'ARL 100% desde día 1' : 
              calculatedDays <= 3 ? 
                'Empleador paga primeros 3 días' :
                'EPS 66.67% desde día 4'
            }
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-gray-400 text-xs">
          Debug: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};
