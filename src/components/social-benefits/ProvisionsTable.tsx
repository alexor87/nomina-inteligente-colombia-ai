
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProvisionRecord } from '@/services/ProvisionsService';

interface ProvisionsTableProps {
  rows: ProvisionRecord[];
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  totalPages: number;
  loading: boolean;
}

const getBenefitTypeLabel = (type: string) => {
  const labels = {
    cesantias: 'Cesantías',
    intereses_cesantias: 'Intereses Cesantías',
    prima: 'Prima',
    vacaciones: 'Vacaciones',
  };
  return labels[type as keyof typeof labels] || type;
};

const getBenefitTypeColor = (type: string) => {
  const colors = {
    cesantias: 'bg-blue-100 text-blue-800',
    intereses_cesantias: 'bg-purple-100 text-purple-800',
    prima: 'bg-green-100 text-green-800',
    vacaciones: 'bg-orange-100 text-orange-800',
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

// 🔧 NEW: Helper to get calculation base display based on benefit type
const getCalculationBaseDisplay = (record: ProvisionRecord) => {
  if (record.benefit_type === 'vacaciones') {
    // Vacaciones: solo salario base
    return {
      amount: record.full_monthly_salary || record.base_salary,
      label: 'Salario base',
      description: 'Solo salario (sin auxilio)',
    };
  } else {
    // Cesantías, prima, intereses: base constitutiva completa
    return {
      amount: record.base_constitutiva_total || (record.base_salary + record.transport_allowance),
      label: 'Base constitutiva',
      description: 'Salario + auxilio transporte',
    };
  }
};

export const ProvisionsTable: React.FC<ProvisionsTableProps> = ({
  rows,
  page,
  pageSize,
  setPage,
  setPageSize,
  totalPages,
  loading,
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando provisiones...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>
            Detalle de Provisiones
            {rows.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({rows.length} registros)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay provisiones para mostrar
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Prestación</TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Base (según prestación)
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs max-w-xs">
                                <p><strong>Cesantías/Prima:</strong> Salario + auxilio transporte</p>
                                <p><strong>Vacaciones:</strong> Solo salario base</p>
                                <p><strong>Intereses:</strong> Sobre cesantías calculadas</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const baseDisplay = getCalculationBaseDisplay(row);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{row.employee_name}</div>
                              {row.employee_cedula && (
                                <div className="text-xs text-gray-500">
                                  CC: {row.employee_cedula}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getBenefitTypeColor(row.benefit_type)}
                            >
                              {getBenefitTypeLabel(row.benefit_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatCurrency(baseDisplay.amount)}
                              </div>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                    {baseDisplay.label}
                                    <Info className="h-3 w-3" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs max-w-xs">
                                    <p>{baseDisplay.description}</p>
                                    {row.full_monthly_salary && (
                                      <>
                                        <p className="mt-1"><strong>Salario:</strong> {formatCurrency(row.full_monthly_salary)}</p>
                                        <p><strong>Auxilio:</strong> {formatCurrency(row.full_monthly_auxilio || 0)}</p>
                                      </>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {row.days_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <div className="font-semibold text-lg">
                                {formatCurrency(row.provision_amount)}
                              </div>
                              {row.is_corrected_calculation && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center justify-end gap-1 text-xs text-green-600">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Corregido
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      Calculado con base mensual completa
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800"
                            >
                              Calculado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
