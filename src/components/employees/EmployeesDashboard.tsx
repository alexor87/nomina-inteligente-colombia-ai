
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plus, 
  Settings, 
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { EmployeeList } from './EmployeeList';
import { CriticalRepairPanel } from '../system/CriticalRepairPanel';
import { useEmployeeList } from '@/hooks/useEmployeeList';

/**
 * Dashboard principal de empleados con diagnóstico integrado
 */
export const EmployeesDashboard = () => {
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const { 
    employees, 
    totalEmployees, 
    isLoading, 
    error 
  } = useEmployeeList();

  const activeEmployees = employees.filter(emp => emp.estado === 'activo').length;
  const hasIssues = totalEmployees === 0 || activeEmployees === 0 || error;

  return (
    <div className="space-y-6">
      {/* Header con métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Empleados</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <span>Activos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={hasIssues ? 'destructive' : 'default'}>
              {hasIssues ? 'Requiere atención' : 'Funcionando'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowRepairPanel(!showRepairPanel)}
              variant={hasIssues ? 'destructive' : 'outline'}
              size="sm"
              className="w-full"
            >
              {hasIssues ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Diagnosticar
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Mantenimiento
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Panel de reparación crítica */}
      {showRepairPanel && (
        <CriticalRepairPanel />
      )}

      {/* Contenido principal */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Lista de Empleados</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuración</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <EmployeeList />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Empleados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Configuraciones avanzadas próximamente...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
