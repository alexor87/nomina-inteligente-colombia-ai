
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Database, RefreshCw } from 'lucide-react';
import { useVacationNovedadSync } from '@/hooks/useVacationNovedadSync';

/**
 * ✅ COMPONENTE DE DIAGNÓSTICO DE ARQUITECTURA LIMPIA
 * Muestra el estado de la sincronización bidireccional
 */
export const PayrollCleanArchitecture = () => {
  const { companyId, isActive } = useVacationNovedadSync();

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          Arquitectura Limpia KISS - Implementada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            <div>
              <p className="font-medium">Módulo Vacaciones</p>
              <p className="text-gray-600">Registro de ausencias</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-green-600">
              <ArrowRight className="h-4 w-4" />
              <RefreshCw className="h-4 w-4 animate-spin" />
              <ArrowRight className="h-4 w-4 rotate-180" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-600" />
            <div>
              <p className="font-medium">Módulo Novedades</p>
              <p className="text-gray-600">Fuente de verdad</p>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Sincronización Bidireccional:</span>
              <span className={`font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                {isActive ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </div>
            
            <div className="text-gray-600">
              Empresa: {companyId || 'No definida'}
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded">
            <strong>Flujo:</strong> Vacaciones ↔ Novedades (bidireccional real-time) → Liquidación (solo consulta novedades)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
