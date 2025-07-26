import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyId } from '@/components/employees/form/useCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Plus, Calendar, Users, DollarSign, History } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PeriodAuditSummaryComponent } from '@/components/payroll/audit/PeriodAuditSummary';
import { NovedadAuditHistoryModal } from '@/components/payroll/audit/NovedadAuditHistoryModal';
import { ConfirmAdjustmentModal } from '@/components/payroll/corrections/ConfirmAdjustmentModal';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { PayrollHistoryModernHeader } from '@/components/payroll/history/PayrollHistoryModernHeader';
import { PayrollHistoryModernStats } from '@/components/payroll/history/PayrollHistoryModernStats';
import { PayrollHistoryModernTable } from '@/components/payroll/history/PayrollHistoryModernTable';
import { PayrollHistoryModernActions } from '@/components/payroll/history/PayrollHistoryModernActions';

interface PeriodDetail {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  estado: string;
}

interface EmployeePayroll {
  id: string;
  empleado_id: string;
  employee_id: string;
  employee_name: string;
  employee_identification: string;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  neto_pagado: number;
  tiene_novedades: boolean;
}

interface PendingNovedad {
  id: string;
  empleado_id: string;
  employee_id: string;
  employee_name: string;
  tipo_novedad: string;
  concepto: string;
  valor: number;
  estado: string;
  novedadData: CreateNovedadData;
}

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<PeriodDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeSalary, setSelectedEmployeeSalary] = useState<number>(0);
  const [selectedNovedadId, setSelectedNovedadId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [pendingNovedades, setPendingNovedades] = useState<PendingNovedad[]>([]);
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Hook para gestionar novedades
  const { createNovedad } = usePayrollNovedadesUnified(periodId || '');
  
  // Hook para obtener company_id
  useCompanyId(setCompanyId);

  const loadPeriodDetail = async () => {
    if (!periodId) return;
    
    try {
      setLoading(true);
      
      // Load period details
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();
      
      if (periodError) throw periodError;
      setPeriod(periodData);

      // Load employees payroll data
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(nombre, apellido, cedula)
        `)
        .eq('period_id', periodId);
      
      if (payrollError) throw payrollError;
      
      const employeesWithNames = payrollData?.map(p => ({
        id: p.id,
        empleado_id: p.employee_id,
        employee_id: p.employee_id,
        employee_name: p.employees.nombre,
        employee_identification: p.employees.cedula || '',
        total_devengado: p.total_devengado || 0,
        total_deducciones: p.total_deducciones || 0,
        total_neto: p.neto_pagado || 0,
        neto_pagado: p.neto_pagado || 0,
        tiene_novedades: false
      })) || [];
      
      setEmployees(employeesWithNames);

      
    } catch (error) {
      console.error('Error loading period detail:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del período",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodDetail();
  }, [periodId]);

  const handleDownloadVoucher = async (employeeId: string, employeeName: string) => {
    toast({
      title: "Funcionalidad pendiente",
      description: `Descarga de comprobante para ${employeeName} - En desarrollo`,
    });
  };

  const handleAdjustmentSuccess = () => {
    setShowAdjustmentModal(false);
    loadPeriodDetail(); // Reload data to show new adjustment
    toast({
      title: "Ajuste registrado",
      description: "El ajuste se ha registrado correctamente",
    });
  };

  const handleOpenAdjustmentModal = (employeeId?: string, employeeSalary?: number) => {
    console.log('🔵 handleOpenAdjustmentModal called with:', { employeeId, employeeSalary });
    console.log('🔵 Period status:', period?.estado);
    console.log('🔵 Current showAdjustmentModal:', showAdjustmentModal);
    
    if (employeeId && employeeSalary) {
      // Ajuste para empleado específico
      setSelectedEmployeeId(employeeId);
      setSelectedEmployeeSalary(employeeSalary);
      const employeeData = employees.find(e => e.empleado_id === employeeId);
      setSelectedEmployeeName(employeeData ? employeeData.employee_name : '');
      setShowAdjustmentModal(true);
      console.log('🔵 Set specific employee data and modal to true');
    } else if (employees.length > 0) {
      // Usar el primer empleado como fallback
      setSelectedEmployeeId(employees[0].empleado_id);
      setSelectedEmployeeSalary(0);
      setSelectedEmployeeName(employees[0].employee_name);
      setShowAdjustmentModal(true);
      console.log('🔵 Set fallback employee data and modal to true');
    } else {
      console.log('🔵 No employees available');
      toast({
        title: "Error",
        description: "No hay empleados disponibles para ajustar",
        variant: "destructive"
      });
    }
  };

  const handleNovedadSubmit = async (data: CreateNovedadData) => {
    // Simplified for modern UI - just apply immediately
    try {
      await createNovedad(data);
      handleAdjustmentSuccess();
    } catch (error) {
      console.error('Error creating novedad:', error);
      throw error;
    }
  };

  const handleApplyPendingAdjustments = async (justification: string) => {
    if (!periodId || pendingNovedades.length === 0) return;

    try {
      setIsApplyingAdjustments(true);

      // Group novelties by employee
      const employeeGroups = pendingNovedades.reduce((groups, novedad) => {
        if (!groups[novedad.employee_id]) {
          groups[novedad.employee_id] = {
            employeeId: novedad.employee_id,
            employeeName: novedad.employee_name,
            novedades: []
          };
        }
        groups[novedad.employee_id].novedades.push(novedad.novedadData);
        return groups;
      }, {} as Record<string, { employeeId: string; employeeName: string; novedades: CreateNovedadData[] }>);

      // Apply adjustments for each employee
      for (const group of Object.values(employeeGroups)) {
        const adjustmentData: PendingAdjustmentData = {
          periodId,
          employeeId: group.employeeId,
          employeeName: group.employeeName,
          justification,
          novedades: group.novedades
        };

        const result = await PendingNovedadesService.applyPendingAdjustments(adjustmentData);
        
        if (!result.success) {
          throw new Error(result.message);
        }
      }

      // Create notification
      await PendingNovedadesService.createAdjustmentNotification(
        periodId,
        Object.keys(employeeGroups).length,
        pendingNovedades.length
      );

      toast({
        title: "Ajustes aplicados",
        description: `Se aplicaron ${pendingNovedades.length} ajustes correctamente`,
      });

      // Clear pending novelties and close modal
      setPendingNovedades([]);
      setShowConfirmModal(false);
      
      // Reload data
      loadPeriodDetail();

    } catch (error) {
      console.error("Error applying adjustments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron aplicar los ajustes",
        variant: "destructive"
      });
    } finally {
      setIsApplyingAdjustments(false);
    }
  };

  const handleRemovePendingNovedad = (index: number) => {
    setPendingNovedades(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to calculate preview totals with pending novelties
  const calculateEmployeePreview = (employee: EmployeePayroll) => {
    const pendingForEmployee = pendingNovedades.filter(p => p.employee_id === employee.employee_id);
    
    if (pendingForEmployee.length === 0) {
      return {
        originalDevengado: employee.total_devengado,
        originalDeducciones: employee.total_deducciones,
        originalNeto: employee.neto_pagado,
        newDevengado: employee.total_devengado,
        newDeducciones: employee.total_deducciones,
        newNeto: employee.neto_pagado,
        hasPending: false,
        pendingCount: 0
      };
    }

    let totalPendingDevengos = 0;
    let totalPendingDeducciones = 0;

    pendingForEmployee.forEach(pending => {
      const { novedadData } = pending;
      if (novedadData.valor > 0) {
        totalPendingDevengos += novedadData.valor;
      } else {
        totalPendingDeducciones += Math.abs(novedadData.valor);
      }
    });

    const newDevengado = employee.total_devengado + totalPendingDevengos;
    const newDeducciones = employee.total_deducciones + totalPendingDeducciones;
    const newNeto = newDevengado - newDeducciones;

    return {
      originalDevengado: employee.total_devengado,
      originalDeducciones: employee.total_deducciones,
      originalNeto: employee.neto_pagado,
      newDevengado,
      newDeducciones,
      newNeto,
      hasPending: true,
      pendingCount: pendingForEmployee.length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Período no encontrado</h2>
          <p className="text-muted-foreground mb-4">El período solicitado no existe o no tienes permisos para verlo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PayrollHistoryModernHeader period={period} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PayrollHistoryModernStats
          totalEmployees={employees.length}
          totalGrossPay={period.total_devengado}
          totalDeductions={period.total_deducciones}
          totalNetPay={period.total_neto}
        />

        <div className="mt-8">
          <PayrollHistoryModernActions
            pendingNovedades={pendingNovedades}
            isLoading={isApplyingAdjustments}
            onApplyPendingAdjustments={() => {}}
            canApplyAdjustments={period.estado === 'closed'}
          />
        </div>

        <div className="mt-8">
          <Tabs defaultValue="employees" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employees">Empleados</TabsTrigger>
              <TabsTrigger value="audit">Historial de Auditoría</TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="mt-6">
              <PayrollHistoryModernTable
                employees={employees}
                pendingNovedades={pendingNovedades}
                isLoading={false}
                onDownloadVoucher={(employeeId) => handleDownloadVoucher(employeeId, '')}
                onOpenAdjustmentModal={(employeeId) => handleOpenAdjustmentModal(employeeId)}
                calculateEmployeePreview={(employee) => ({
                  totalDevengado: employee.total_devengado,
                  totalDeducciones: employee.total_deducciones,
                  totalNeto: employee.total_neto,
                  hasPendingChanges: false
                })}
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <PeriodAuditSummaryComponent 
                periodId={periodId || ''} 
                periodName={period.periodo} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Adjustment Modal */}
      <NovedadUnifiedModal
        mode="ajustes"
        open={showAdjustmentModal}
        setOpen={setShowAdjustmentModal}
        employeeId={selectedEmployeeId}
        employeeSalary={selectedEmployeeSalary}
        periodId={periodId}
        onSubmit={handleNovedadSubmit}
        selectedNovedadType={null}
        startDate={period?.fecha_inicio}
        endDate={period?.fecha_fin}
        companyId={companyId}
        onClose={() => setShowAdjustmentModal(false)}
      />

      {/* Confirmation Modal for Pending Adjustments */}
      <ConfirmAdjustmentModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApplyPendingAdjustments}
        pendingNovedades={pendingNovedades}
        periodName={period?.periodo || ''}
        isLoading={isApplyingAdjustments}
      />

      {/* Audit History Modal */}
      <NovedadAuditHistoryModal
        open={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        novedadId={selectedNovedadId}
        employeeName={selectedEmployeeName}
      />
    </div>
  );
};