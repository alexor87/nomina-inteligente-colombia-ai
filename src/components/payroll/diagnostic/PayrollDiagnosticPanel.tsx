
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, Database, Sync, CheckCircle } from 'lucide-react';
import { PayrollCleanArchitecture } from '@/components/payroll/PayrollCleanArchitecture';

export const PayrollDiagnosticPanel = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bug className="h-6 w-6 text-orange-600" />
        <h2 className="text-2xl font-bold">Diagnóstico del Sistema</h2>
      </div>

      <Tabs defaultValue="architecture" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="architecture" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Arquitectura
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Sync className="h-4 w-4" />
            Sincronización
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Datos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="space-y-4">
          <PayrollCleanArchitecture />
          
          <Card>
            <CardHeader>
              <CardTitle>Estado de Implementación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Eliminada arquitectura híbrida redundante</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Consolidada página de liquidación única</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Implementada sincronización bidireccional real-time</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Liquidación consulta solo módulo de novedades</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sincronización Bidireccional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="mb-2"><strong>Eventos monitoreados:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Cambios en payroll_novedades → Actualiza employee_vacation_periods</li>
                    <li>Cambios en employee_vacation_periods → Actualiza payroll_novedades</li>
                    <li>Sincronización en tiempo real via Supabase Realtime</li>
                    <li>Validación de tipos de ausencia compatibles</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fuente de Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Módulo de Liquidación</h4>
                  <p className="text-sm text-blue-700">
                    Obtiene TODA la información exclusivamente del módulo de novedades (payroll_novedades).
                    No consulta directamente employee_vacation_periods.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Sincronización Automática</h4>
                  <p className="text-sm text-green-700">
                    Los cambios en cualquier módulo se propagan automáticamente al otro.
                    El módulo de novedades es la fuente de verdad para liquidación.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
