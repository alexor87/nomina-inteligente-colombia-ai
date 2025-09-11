import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Mail, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollNovedad } from '@/types/novedades';
import { VoucherPreviewModal } from '@/components/payroll/modals/VoucherPreviewModal';
import { transformPayrollHistoryToEmployee, PayrollHistoryData } from '@/utils/payrollDataTransformer';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';
import { PayrollEmployee } from '@/types/payroll';
import { PeriodEditState, EditingChanges } from '@/types/period-editing';

interface ExpandedEmployee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
  eps: string;
  afp: string;
  salario_base: number;
  ibc: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  auxilio_transporte: number;
  salud_empleado: number;
  pension_empleado: number;
  horas_extra: number;
  bonificaciones: number;
  comisiones: number;
  cesantias: number;
  prima: number;
  vacaciones: number;
  incapacidades: number;
  otros_devengos: number;
  descuentos_varios: number;
  retencion_fuente: number;
  payroll_id: string;
}

interface ExpandedEmployeesTableProps {
  employees: ExpandedEmployee[];
  novedades: Record<string, PayrollNovedad[]>;
  onAddNovedad: (employeeId: string) => void;
  onEditNovedad: (novedad: PayrollNovedad) => void;
  canEdit: boolean;
  // New edit period props
  editState?: PeriodEditState;
  pendingChanges?: EditingChanges;
  isRecalculatingBackend?: boolean;
  // Voucher preview functionality
  periodData?: {
    id?: string;
    fecha_inicio: string;
    fecha_fin: string;
    tipo_periodo: string;
  };
}

export const ExpandedEmployeesTable = ({
  employees,
  novedades,
  onAddNovedad,
  onEditNovedad,
  canEdit,
  editState,
  pendingChanges,
  isRecalculatingBackend = false,
  periodData
}: ExpandedEmployeesTableProps) => {
  const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});

  // Helper function to count pending novedades for an employee
  const getPendingNovedadesCount = (employeeId: string): number => {
    if (!pendingChanges) return 0;
    // The pending changes structure groups by employeeId in payrollData
    return Object.keys(pendingChanges.payrollData).includes(employeeId) ? 1 : 0;
  };
  
  // Voucher preview modal state
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  
  // Get company details for voucher
  const { companyDetails } = useCompanyDetails();

  const getNovedadesCount = (employeeId: string): number => {
    return novedades[employeeId]?.length || 0;
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
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !periodData) {
      console.error('Employee or period data not found');
      return;
    }

    try {
      // Transform ExpandedEmployee to PayrollHistoryData format
      const historyData: PayrollHistoryData = {
        employee_id: employee.id,
        employee_name: employee.nombre,
        employee_lastname: employee.apellido,
        total_devengado: employee.total_devengado,
        total_deducciones: employee.total_deducciones,
        neto_pagado: employee.neto_pagado,
        salario_base: employee.salario_base,
        dias_trabajados: employee.dias_trabajados,
        ibc: employee.ibc,
        auxilio_transporte: employee.auxilio_transporte,
        salud_empleado: employee.salud_empleado,
        pension_empleado: employee.pension_empleado,
        horas_extra: employee.horas_extra,
        bonificaciones: employee.bonificaciones,
        comisiones: employee.comisiones,
        cesantias: employee.cesantias,
        prima: employee.prima,
        vacaciones: employee.vacaciones,
        incapacidades: employee.incapacidades,
        otros_devengos: employee.otros_devengos,
        otros_descuentos: employee.descuentos_varios, // Map descuentos_varios to otros_descuentos
        retencion_fuente: employee.retencion_fuente,
        completeEmployeeData: {
          id: employee.id,
          nombre: employee.nombre,
          apellido: employee.apellido,
          cedula: employee.cedula || 'N/A',
          email: '',
          telefono: '',
          cargo: employee.cargo || 'N/A',
          salario_base: employee.salario_base,
          banco: '',
          tipo_cuenta: '',
          numero_cuenta: '',
          eps: employee.eps || 'N/A',
          afp: employee.afp || 'N/A',
          arl: 'N/A',
          caja_compensacion: 'N/A'
        }
      };

      // Transform to PayrollEmployee format
      const payrollEmployee = transformPayrollHistoryToEmployee(historyData);
      
      // Set selected employee, payroll ID and show modal
      setSelectedEmployee(payrollEmployee);
      setSelectedPayrollId(employee.payroll_id);
      setShowVoucherPreview(true);
      
    } catch (error) {
      console.error('Error transforming employee data:', error);
    }
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
                const pendingCount = getPendingNovedadesCount(employee.id);
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
                      {editState === 'editing' && pendingCount > 0 && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 mt-1 animate-pulse">
                          Cambios pendientes
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
                      <span className="font-semibold text-green-600">
                        {formatCurrency(employee.total_devengado)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="bg-red-100 text-right">
                      <span className="font-semibold text-red-600">
                        {formatCurrency(employee.total_deducciones)}
                      </span>
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
                          {pendingCount > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 animate-pulse text-xs">
                              +{pendingCount}
                            </Badge>
                          )}
                       </div>
                     </TableCell>
                    
                    <TableCell className="bg-blue-100 text-right">
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(employee.neto_pagado)}
                      </span>
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
      
      {/* Voucher Preview Modal */}
      <VoucherPreviewModal
        isOpen={showVoucherPreview}
        onClose={() => {
          setShowVoucherPreview(false);
          setSelectedEmployee(null);
          setSelectedPayrollId(null);
        }}
        employee={selectedEmployee}
        period={periodData ? {
          startDate: periodData.fecha_inicio,
          endDate: periodData.fecha_fin,
          type: periodData.tipo_periodo
        } : null}
        payrollId={selectedPayrollId}
        periodId={periodData?.id} // Pass period ID for backend lookup
        companyInfo={companyDetails ? {
          razon_social: companyDetails.razon_social,
          nit: companyDetails.nit,
          direccion: companyDetails.direccion,
          ciudad: companyDetails.ciudad,
          telefono: companyDetails.telefono,
          email: companyDetails.email
        } : null}
      />
    </Card>
  );
};