import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollNovedad } from '@/types/novedades';

interface ExpandedEmployee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  ibc: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  payroll_id: string;
}

interface ExpandedEmployeesTableProps {
  employees: ExpandedEmployee[];
  novedades: Record<string, PayrollNovedad[]>;
  onAddNovedad: (employeeId: string) => void;
  onEditNovedad: (novedad: PayrollNovedad) => void;
  canEdit: boolean;
}

export const ExpandedEmployeesTable = ({
  employees,
  novedades,
  onAddNovedad,
  onEditNovedad,
  canEdit
}: ExpandedEmployeesTableProps) => {
  
  const getNovedadesCount = (employeeId: string): number => {
    return novedades[employeeId]?.length || 0;
  };

  const getEmployeeNovedades = (employeeId: string): PayrollNovedad[] => {
    return novedades[employeeId] || [];
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-foreground">Empleado</th>
            <th className="text-right p-3 font-medium text-foreground">IBC</th>
            <th className="text-right p-3 font-medium text-foreground">Días Trabajados</th>
            <th className="text-right p-3 font-medium text-foreground">Total Devengado</th>
            <th className="text-right p-3 font-medium text-foreground">Total Deducciones</th>
            <th className="text-right p-3 font-medium text-foreground">Neto Pagado</th>
            <th className="text-center p-3 font-medium text-foreground">Novedades</th>
            {canEdit && (
              <th className="text-center p-3 font-medium text-foreground">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const novedadesCount = getNovedadesCount(employee.id);
            const employeeNovedades = getEmployeeNovedades(employee.id);
            
            return (
              <tr key={employee.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {employee.nombre} {employee.apellido}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {employee.id.slice(0, 8)}...
                    </div>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium text-foreground">
                    {formatCurrency(employee.ibc)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium text-foreground">
                    {employee.dias_trabajados}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium text-green-600">
                    {formatCurrency(employee.total_devengado)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium text-red-600">
                    {formatCurrency(employee.total_deducciones)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium text-blue-600">
                    {formatCurrency(employee.neto_pagado)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Badge variant={novedadesCount > 0 ? "default" : "outline"}>
                      {novedadesCount}
                    </Badge>
                    {employeeNovedades.length > 0 && canEdit && (
                      <div className="flex flex-wrap gap-1">
                        {employeeNovedades.slice(0, 2).map((novedad) => (
                          <Button
                            key={novedad.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditNovedad(novedad)}
                            className="text-xs p-1 h-6"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {novedad.tipo_novedad}
                          </Button>
                        ))}
                        {employeeNovedades.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{employeeNovedades.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                {canEdit && (
                  <td className="p-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddNovedad(employee.id)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};