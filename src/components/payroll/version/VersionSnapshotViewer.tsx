import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Receipt, TrendingUp, Search, Download, Calendar } from 'lucide-react';
import { PeriodVersionComparisonService } from '@/services/PeriodVersionComparisonService';

interface EmployeeSnapshotData {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  salario_base: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  [key: string]: any;
}

interface NovedadSnapshotData {
  id: string;
  empleado_id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  [key: string]: any;
}

interface PayrollSnapshotData {
  id: string;
  employee_id: string;
  periodo: string;
  estado: string;
  salario_base: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  ibc: number;
  salud_empleado: number;
  pension_empleado: number;
  auxilio_transporte: number;
  [key: string]: any;
}

interface PeriodSnapshot {
  employees?: EmployeeSnapshotData[];
  novedades?: NovedadSnapshotData[];
  payrolls?: PayrollSnapshotData[];
  employeeIdentity?: { [employeeId: string]: { nombre: string; apellido: string; tipo_documento: string; cedula: string } };
  timestamp?: string;
  [key: string]: any;
}

interface VersionSnapshotViewerProps {
  versionId: string;
  versionNumber: number;
  snapshotData: PeriodSnapshot;
  createdAt: string;
  versionType: string;
  changesSummary?: string;
}

export const VersionSnapshotViewer: React.FC<VersionSnapshotViewerProps> = ({
  versionId,
  versionNumber,
  snapshotData,
  createdAt,
  versionType,
  changesSummary
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('employees');

  const employees = snapshotData.employees || [];
  const novedades = snapshotData.novedades || [];
  const payrolls = snapshotData.payrolls || [];
  const employeeIdentity = snapshotData.employeeIdentity || {};

  // Helper function to resolve employee identity from multiple sources
  const resolveEmployeeIdentity = (employeeId: string) => {
    // 1. Try to find in employees array first
    const employeeInArray = employees.find(emp => emp.id === employeeId);
    if (employeeInArray) {
      return {
        nombre: employeeInArray.nombre,
        apellido: employeeInArray.apellido,
        cedula: employeeInArray.cedula
      };
    }

    // 2. Try to find in employeeIdentity object
    const identityData = employeeIdentity[employeeId];
    if (identityData) {
      return {
        nombre: identityData.nombre,
        apellido: identityData.apellido,
        cedula: identityData.cedula
      };
    }

    // 3. Try to find in embedded payroll data
    const payrollData = payrolls.find(p => p.employee_id === employeeId);
    if (payrollData && (payrollData as any).employee_nombre) {
      return {
        nombre: (payrollData as any).employee_nombre,
        apellido: (payrollData as any).employee_apellido || '',
        cedula: (payrollData as any).employee_cedula || ''
      };
    }

    // 4. Fallback: return ID with partial info
    return {
      nombre: `Empleado ${employeeId.slice(-8)}`,
      apellido: '',
      cedula: ''
    };
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => 
    emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cedula?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totals = {
    totalEmployees: employees.length,
    totalDevengado: employees.reduce((sum, emp) => sum + (emp.total_devengado || 0), 0),
    totalDeducciones: employees.reduce((sum, emp) => sum + (emp.total_deducciones || 0), 0),
    totalNeto: employees.reduce((sum, emp) => sum + (emp.neto_pagado || 0), 0),
    totalNovedades: novedades.length
  };

  const exportSnapshot = () => {
    const csvData = employees.map(emp => ({
      cedula: emp.cedula,
      nombre: emp.nombre,
      apellido: emp.apellido,
      salario_base: emp.salario_base,
      dias_trabajados: emp.dias_trabajados,
      total_devengado: emp.total_devengado,
      total_deducciones: emp.total_deducciones,
      neto_pagado: emp.neto_pagado
    }));

    const csvContent = [
      ['Cédula', 'Nombre', 'Apellido', 'Salario Base', 'Días Trabajados', 'Total Devengado', 'Total Deducciones', 'Neto Pagado'],
      ...csvData.map(row => Object.values(row))
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `version-${versionNumber}-snapshot.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header with version info and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium">
              Versión {versionNumber} - {new Date(createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {changesSummary || 'Sin descripción disponible'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={
            versionType === 'initial' ? 'secondary' :
            versionType === 'correction' ? 'destructive' :
            versionType === 'rollback' ? 'outline' :
            'default'
          }>
            {versionType === 'initial' ? 'Inicial' :
             versionType === 'correction' ? 'Corrección' :
             versionType === 'rollback' ? 'Rollback' :
             'Manual'}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportSnapshot}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totals.totalEmployees}</div>
                <div className="text-sm text-muted-foreground">Empleados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {PeriodVersionComparisonService.formatCurrency(totals.totalDevengado)}
                </div>
                <div className="text-sm text-muted-foreground">Devengado</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {PeriodVersionComparisonService.formatCurrency(totals.totalDeducciones)}
                </div>
                <div className="text-sm text-muted-foreground">Deducciones</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <div>
                <div className="text-2xl font-bold">
                  {PeriodVersionComparisonService.formatCurrency(totals.totalNeto)}
                </div>
                <div className="text-sm text-muted-foreground">Neto Pagado</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Empleados ({totals.totalEmployees})
          </TabsTrigger>
          <TabsTrigger value="novedades" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Novedades ({totals.totalNovedades})
          </TabsTrigger>
          <TabsTrigger value="payrolls" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Nóminas ({payrolls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado por nombre o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredEmployees.map((employee) => (
                <Card key={employee.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.cedula}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {PeriodVersionComparisonService.formatCurrency(employee.neto_pagado)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Salario Base: {PeriodVersionComparisonService.formatCurrency(employee.salario_base)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Días:</span> {employee.dias_trabajados}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Devengado:</span> {PeriodVersionComparisonService.formatCurrency(employee.total_devengado)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deducciones:</span> {PeriodVersionComparisonService.formatCurrency(employee.total_deducciones)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="novedades" className="space-y-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {novedades.map((novedad) => {
                const employeeInfo = resolveEmployeeIdentity(novedad.empleado_id);
                return (
                  <Card key={novedad.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{novedad.tipo_novedad}</div>
                        {novedad.subtipo && (
                          <div className="text-sm text-muted-foreground">{novedad.subtipo}</div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {employeeInfo.nombre} {employeeInfo.apellido}
                          {employeeInfo.cedula && ` - ${employeeInfo.cedula}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {PeriodVersionComparisonService.formatCurrency(novedad.valor)}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="payrolls" className="space-y-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {payrolls.map((payroll) => {
                const employeeInfo = resolveEmployeeIdentity(payroll.employee_id);
                return (
                  <Card key={payroll.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {employeeInfo.nombre} {employeeInfo.apellido}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Período: {payroll.periodo} | Estado: {payroll.estado}
                          {employeeInfo.cedula && ` | ${employeeInfo.cedula}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {PeriodVersionComparisonService.formatCurrency(payroll.neto_pagado)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">IBC:</span> {PeriodVersionComparisonService.formatCurrency(payroll.ibc)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Salud:</span> {PeriodVersionComparisonService.formatCurrency(payroll.salud_empleado)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pensión:</span> {PeriodVersionComparisonService.formatCurrency(payroll.pension_empleado)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aux. Transporte:</span> {PeriodVersionComparisonService.formatCurrency(payroll.auxilio_transporte)}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};