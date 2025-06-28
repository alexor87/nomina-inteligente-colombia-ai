
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Plus } from 'lucide-react';
import { PayrollNovedad } from '@/types/novedades';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  neto_pagado: number;
}

interface PeriodEmployeesTableProps {
  employees: Employee[];
  novedades: Record<string, PayrollNovedad[]>;
  onAddNovedad: (employeeId: string) => void;
  onEditNovedad: (novedad: PayrollNovedad) => void;
  canEdit: boolean;
}

export const PeriodEmployeesTable = ({
  employees,
  novedades,
  onAddNovedad,
  onEditNovedad,
  canEdit
}: PeriodEmployeesTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getEmployeeNovedades = (employeeId: string) => {
    return novedades[employeeId] || [];
  };

  const getTotalNovedadesImpact = (employeeId: string) => {
    const employeeNovedades = getEmployeeNovedades(employeeId);
    return employeeNovedades.reduce((total, novedad) => {
      // Determine if it's a deduction or earning based on type
      const isDeduction = ['descuento_salud', 'descuento_pension', 'retencion_fuente', 'prestamo'].includes(novedad.tipo_novedad);
      return total + (isDeduction ? -novedad.valor : novedad.valor);
    }, 0);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold min-w-[200px]">Empleado</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Salario Base</TableHead>
              <TableHead className="font-semibold min-w-[150px]">Novedades</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Total Neto</TableHead>
              {canEdit && <TableHead className="font-semibold text-center min-w-[120px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const employeeNovedades = getEmployeeNovedades(employee.id);
              const novedadesImpact = getTotalNovedadesImpact(employee.id);
              const adjustedTotal = employee.neto_pagado + novedadesImpact;

              return (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell className="min-w-[200px]">
                    <div>
                      <div className="font-medium text-gray-900">
                        {employee.nombre} {employee.apellido}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <span className="font-medium text-green-600">
                      {formatCurrency(employee.salario_base)}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="flex flex-wrap gap-1">
                      {employeeNovedades.length > 0 ? (
                        employeeNovedades.map((novedad) => (
                          <div key={novedad.id} className="flex items-center space-x-1">
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-gray-100"
                              onClick={() => canEdit && onEditNovedad(novedad)}
                            >
                              {novedad.tipo_novedad}
                              {canEdit && <Edit2 className="h-3 w-3 ml-1" />}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">Sin novedades</span>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddNovedad(employee.id)}
                          className="h-6 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <span className={`font-medium ${adjustedTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(adjustedTotal)}
                    </span>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddNovedad(employee.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
