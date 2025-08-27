import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PendingNovedad, EmployeeNovedadPreview } from '@/types/pending-adjustments';
import { formatPreviewCurrency } from '@/utils/pendingAdjustmentsPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Mail } from 'lucide-react';
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
  pendingNovedades?: PendingNovedad[];
  getPendingCount?: (employeeId: string) => number;
  calculateEmployeePreview?: (employee: any) => EmployeeNovedadPreview;
}

export const ExpandedEmployeesTable = ({
  employees,
  novedades,
  onAddNovedad,
  onEditNovedad,
  canEdit,
  pendingNovedades = [],
  getPendingCount,
  calculateEmployeePreview
}: ExpandedEmployeesTableProps) => {
  const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});

  const getNovedadesCount = (employeeId: string): number => {
    return novedades[employeeId]?.length || 0;
  };

  const getPendingNovedadesCount = (employeeId: string): number => {
    return getPendingCount ? getPendingCount(employeeId) : 0;
  };

  const getEmployeePreview = (employee: ExpandedEmployee): EmployeeNovedadPreview => {
    if (calculateEmployeePreview) {
      return calculateEmployeePreview(employee);
    }
    
    // Default preview with no changes
    return {
      hasPending: false,
      pendingCount: 0,
      originalDevengado: employee.total_devengado,
      newDevengado: employee.total_devengado,
      originalDeducciones: employee.total_deducciones,
      newDeducciones: employee.total_deducciones,
      originalNeto: employee.neto_pagado,
      newNeto: employee.neto_pagado
    };
  };

  const handleSendEmail = async (employeeId: string, employeeName: string, hasEmail: boolean) => {
    if (!hasEmail) return;
    
    setSendingEmails(prev => ({ ...prev, [employeeId]: true }));
    
    try {
      // Mock email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Email sent to ${employeeName}`);
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSendingEmails(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const handleDownloadPDF = (employeeId: string, employeeName: string) => {
    console.log(`Downloading PDF for ${employeeName}`);
    // Mock PDF download
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empleados Liquidados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                  Empleado
                </TableHead>
                <TableHead className="min-w-[140px] text-right">Salario Base</TableHead>
                <TableHead className="min-w-[140px] text-right">IBC</TableHead>
                <TableHead className="min-w-[100px] text-center">Días Trabajados</TableHead>
                <TableHead className="min-w-[140px] bg-green-100 text-right font-semibold">
                  Total Devengado
                </TableHead>
                <TableHead className="min-w-[140px] bg-red-100 text-right font-semibold">
                  Total Deducciones
                </TableHead>
                <TableHead className="min-w-[100px] text-center">
                  Novedades
                </TableHead>
                <TableHead className="min-w-[140px] bg-blue-100 text-right font-semibold">
                  Neto Pagado
                </TableHead>
                {canEdit && (
                  <TableHead className="min-w-[140px] sticky right-0 bg-background z-10 text-center">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const novedadesCount = getNovedadesCount(employee.id);
                const preview = getEmployeePreview(employee);
                const hasEmail = true; // Mock email availability
                const isSendingEmail = sendingEmails[employee.id] || false;
                
                return (
                  <TableRow key={employee.id} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 bg-background z-10 min-w-[200px] font-medium">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium">
                            {employee.nombre} {employee.apellido}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {employee.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                      {preview.hasPending && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 mt-1 animate-pulse">
                          Ajustes pendientes
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <span className="font-medium text-foreground">
                        {formatCurrency(employee.salario_base)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <span className="font-medium text-foreground">
                        {formatCurrency(employee.ibc)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <span className="font-medium text-foreground">
                        {employee.dias_trabajados}
                      </span>
                    </TableCell>
                    
                    <TableCell className="bg-green-100 text-right">
                      {preview.hasPending ? (
                        <div className="space-y-1">
                          <div className="text-muted-foreground line-through text-sm">
                            {formatCurrency(preview.originalDevengado)}
                          </div>
                          <div className="font-semibold text-green-600">
                            {formatCurrency(preview.newDevengado)}
                            <span className="text-xs ml-1">
                              (+{formatCurrency(preview.newDevengado - preview.originalDevengado)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-green-600">
                          {formatCurrency(employee.total_devengado)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell className="bg-red-100 text-right">
                      {preview.hasPending ? (
                        <div className="space-y-1">
                          <div className="text-muted-foreground line-through text-sm">
                            {formatCurrency(preview.originalDeducciones)}
                          </div>
                          <div className="font-semibold text-red-600">
                            {formatCurrency(preview.newDeducciones)}
                            <span className="text-xs ml-1">
                              (+{formatCurrency(preview.newDeducciones - preview.originalDeducciones)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-red-600">
                          {formatCurrency(employee.total_deducciones)}
                        </span>
                      )}
                    </TableCell>
                    
                     <TableCell className="text-center font-medium">
                       <div className="flex items-center justify-center gap-2">
                         {canEdit && (
                           <Button
                             size="sm"
                             variant="outline"
                             className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                             onClick={() => onAddNovedad(employee.id)}
                           >
                             <Plus className="h-4 w-4" />
                           </Button>
                         )}
                         {(novedadesCount > 0) && (
                           <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                             {novedadesCount}
                           </Badge>
                         )}
                         {preview.pendingCount > 0 && (
                           <Badge variant="secondary" className="bg-orange-100 text-orange-800 animate-pulse text-xs">
                             +{preview.pendingCount}
                           </Badge>
                         )}
                       </div>
                     </TableCell>
                    
                    <TableCell className="bg-blue-100 text-right">
                      {preview.hasPending ? (
                        <div className="space-y-1">
                          <div className="text-muted-foreground line-through text-sm">
                            {formatCurrency(preview.originalNeto)}
                          </div>
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(preview.newNeto)}
                            <span className="text-xs ml-1">
                              ({preview.newNeto > preview.originalNeto ? '+' : ''}{formatCurrency(preview.newNeto - preview.originalNeto)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(employee.neto_pagado)}
                        </span>
                      )}
                    </TableCell>
                    
                    {canEdit && (
                      <TableCell className="sticky right-0 bg-background z-10 text-center font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label="Descargar comprobante"
                            title="Descargar comprobante"
                            onClick={() => handleDownloadPDF(employee.id, `${employee.nombre} ${employee.apellido}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSendingEmail || !hasEmail}
                            aria-label="Enviar por email"
                            title={hasEmail ? "Enviar comprobante por email" : "Empleado sin email registrado"}
                            className={!hasEmail ? "opacity-50 cursor-not-allowed" : ""}
                            onClick={() => handleSendEmail(employee.id, `${employee.nombre} ${employee.apellido}`, hasEmail)}
                          >
                            {isSendingEmail ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
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
      </CardContent>
    </Card>
  );
};