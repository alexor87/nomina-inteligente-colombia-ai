
/**
 * ✅ COMPONENTE UNIFICADO DE HISTORIAL - ARQUITECTURA CRÍTICA REPARADA
 * Componente principal que reemplaza PayrollHistoryPageSimple y otros
 * Usa la nueva arquitecutra de servicios unificada
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, Calendar, Users, DollarSign } from 'lucide-react';
import { usePayrollDomain } from '@/hooks/usePayrollDomain';
import { PayrollStateManager } from '@/services/PayrollStateManager';
import { formatCurrency } from '@/lib/utils';

export const PayrollHistoryUnified = () => {
  const { isLoading, history, loadHistory } = usePayrollDomain();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando historial...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Historial de Nómina</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {history.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay períodos en el historial
            </h3>
            <p className="text-gray-600">
              Los períodos procesados aparecerán aquí una vez completados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((period) => (
            <Card key={period.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{period.periodo}</h3>
                      <p className="text-sm text-gray-600">
                        {period.fecha_inicio} - {period.fecha_fin}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            period.estado === 'closed' 
                              ? 'border-green-200 text-green-700' 
                              : period.estado === 'active'
                              ? 'border-yellow-200 text-yellow-700'
                              : 'border-blue-200 text-blue-700'
                          }`}
                        >
                          {PayrollStateManager.getStateLabel(period.estado)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {period.tipo_periodo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {period.empleados_count}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Empleados</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {formatCurrency(period.total_devengado)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Devengado</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">
                            {formatCurrency(period.total_neto)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Neto</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
