
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollNovedad } from '@/types/novedades';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  salario_base: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  payroll_id: string;
  estado: string;
}

interface PeriodEmployeesTableProps {
  employees: Employee[];
  novedades: Record<string, PayrollNovedad[]>;
  onAddNovedad: (employeeId: string) => void;
  onEditNovedad: (novedad: PayrollNovedad) => void;
  onDownloadPDF: (employee: Employee) => void;
  canEdit: boolean;
  getEmployeeNovedadesCount?: (employeeId: string) => number;
  isDownloadingPDF?: string | null; // ID del empleado que está descargando
}

export const PeriodEmployeesTable = ({
  employees,
  novedades,
  onAddNovedad,
  onEditNovedad,
  onDownloadPDF,
  canEdit,
  getEmployeeNovedadesCount,
  isDownloadingPDF
}: PeriodEmployeesTableProps) => {
  
  const getNovedadesCount = (employeeId: string): number => {
    if (getEmployeeNovedadesCount) {
      return getEmployeeNovedadesCount(employeeId);
    }
    return novedades[employeeId]?.length || 0;
  };

  const getEmployeeNovedades = (employeeId: string): PayrollNovedad[] => {
    return novedades[employeeId] || [];
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-4 font-medium text-gray-900">Empleado</th>
            <th className="text-right p-4 font-medium text-gray-900">Salario Base</th>
            <th className="text-right p-4 font-medium text-gray-900">Total Devengado</th>
            <th className="text-right p-4 font-medium text-gray-900">Total Deducciones</th>
            <th className="text-right p-4 font-medium text-gray-900">Neto Pagado</th>
            <th className="text-center p-4 font-medium text-gray-900">Novedades</th>
            <th className="text-center p-4 font-medium text-gray-900">PDF</th>
            {canEdit && (
              <th className="text-center p-4 font-medium text-gray-900">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const novedadesCount = getNovedadesCount(employee.id);
            const employeeNovedades = getEmployeeNovedades(employee.id);
            const isDownloading = isDownloadingPDF === employee.id;
            
            return (
              <tr key={employee.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {employee.nombre} {employee.apellido}
                    </div>
                    <div className="text-sm text-gray-500">
                      {employee.cargo}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(employee.salario_base)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-medium text-green-600">
                    {formatCurrency(employee.total_devengado)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-medium text-red-600">
                    {formatCurrency(employee.total_deducciones)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-medium text-blue-600">
                    {formatCurrency(employee.neto_pagado)}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Badge variant={novedadesCount > 0 ? "default" : "outline"}>
                      {novedadesCount} {novedadesCount === 1 ? 'novedad' : 'novedades'}
                    </Badge>
                    {employeeNovedades.length > 0 && canEdit && (
                      <div className="flex flex-wrap gap-1">
                        {employeeNovedades.slice(0, 3).map((novedad) => (
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
                        {employeeNovedades.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{employeeNovedades.length - 3} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownloadPDF(employee)}
                    disabled={isDownloading}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Download className={`h-4 w-4 mr-1 ${isDownloading ? 'animate-spin' : ''}`} />
                    {isDownloading ? 'Generando...' : 'PDF'}
                  </Button>
                </td>
                {canEdit && (
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddNovedad(employee.id)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
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
