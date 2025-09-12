import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, ArrowLeft, Users, History, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { PayrollNovedad as PayrollNovedadEnhanced, CreateNovedadData } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades';
import { PayrollHistoryService, PayrollPeriodData, PayrollEmployeeData } from '@/services/PayrollHistoryService';
import { useEmployeeNovedadesCacheStore } from '@/stores/employeeNovedadesCacheStore';
import { PeriodSummaryCards } from '@/components/payroll-history/PeriodSummaryCards';
import { ExpandedEmployeesTable } from '@/components/payroll-history/ExpandedEmployeesTable';
import { formatCurrency } from '@/lib/utils';
import { PendingNovedad, PeriodState } from '@/types/pending-adjustments';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { ConfirmAdjustmentModal } from '@/components/payroll/corrections/ConfirmAdjustmentModal';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { PayrollRecalculationService } from '@/services/PayrollRecalculationService';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { PendingAdjustmentsService } from '@/services/PendingAdjustmentsService';
import { usePendingAdjustments } from '@/hooks/usePendingAdjustments';
import { PeriodAuditSummaryComponent } from '@/components/payroll/audit/PeriodAuditSummary';
import { PayrollCalculationBackendService, PayrollCalculationInput } from '@/services/PayrollCalculationBackendService';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';
import { convertNovedadesToIBC } from '@/utils/payrollCalculationsBackend';
import { PayrollEditProvider, usePayrollEdit } from '@/contexts/PayrollEditContext';
import { PayrollActionsPanel } from '@/components/payroll/actions/PayrollActionsPanel';
import { AddEmployeeModal } from '@/components/payroll/edit/AddEmployeeModal';
import { CompositionChangesModal } from '@/components/payroll/edit/CompositionChangesModal';
import { Edit } from 'lucide-react';

// Use PayrollPeriodData from service instead of local interface

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

function PayrollHistoryDetailPageContent() {
  const { editMode, enterEditMode, applyChanges, discardChanges, addEmployeeToPeriod, removeEmployeeFromPeriod } = usePayrollEdit();
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<ExpandedEmployee[]>([]);
  const [periodData, setPeriodData] = useState<PayrollPeriodData | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isRecalculatingAll, setIsRecalculatingAll] = useState(false);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);
  
  // States for pending adjustments logic - replaced with hook
  const {
    pendingNovedades,
    totalPendingCount,
    isApplying,
    addPendingNovedad,
    clearAllPending,
    applyPendingAdjustments: applyAdjustments,
    getPendingCount,
    calculateEmployeePreview,
    removePendingNovedadesForEmployee,
    loadPendingFromDatabase
  } = usePendingAdjustments({ 
    periodId: periodId || '', 
    companyId: periodData?.company_id || '' 
  });
  
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCompositionChangesModal, setShowCompositionChangesModal] = useState(false);

  // Load novedades for the period
  const {
    novedades,
    isLoading: isLoadingNovedades,
    refetch: refetchNovedades,
    createNovedad,
    getEmployeeNovedadesList
  } = usePayrollNovedadesUnified({ 
    companyId: periodData?.company_id, 
    periodId: periodId || '', 
    enabled: !!periodData?.company_id && !!periodId 
  });

  // Get lastRefreshTime from global store to trigger UI updates
  const { lastRefreshTime } = useEmployeeNovedadesCacheStore();

  // Auto-refresh when global store updates (e.g., after deleting a novedad)
  useEffect(() => {
    if (lastRefreshTime && periodData?.company_id && periodId) {
      console.log('🔄 Global store updated, refreshing novedades...');
      refetchNovedades();
    }
  }, [lastRefreshTime, refetchNovedades, periodData?.company_id, periodId]);

  // Load period data
  useEffect(() => {
    const loadPeriodData = async () => {
      if (!periodId) return;
      
      setIsLoadingPeriod(true);
      try {
        const data = await PayrollHistoryService.getPeriodData(periodId);
        setPeriodData(data);
      } catch (error) {
        console.error('Error loading period data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del período",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPeriod(false);
      }
    };

    loadPeriodData();
  }, [periodId]);

  // Trigger IBC recalculation for this specific period if needed
  useEffect(() => {
    const recalculateIBC = async () => {
      if (periodData?.id === '570c775d-a680-425c-9566-d6e38ae7f729' && periodData?.company_id) {
        try {
          console.log('🔧 Running IBC fix for affected period...');
          const result = await PayrollRecalculationService.recalculateIBC(periodData.id, periodData.company_id);
          
          if (result.success) {
            console.log('✅ IBC recalculation completed:', result);
            // Reload employees to show corrected IBC
            await loadEmployees();
            toast({
              title: "IBC Corregido",
              description: `IBC recalculado para ${result.employees_processed} empleados`,
            });
          }
        } catch (error) {
          console.error('❌ IBC recalculation failed:', error);
        }
      }
    };

    if (periodData) {
      recalculateIBC();
    }
  }, [periodData]);

  // Recalculate all employees using backend service
  const recalculateAllEmployees = async () => {
    if (!periodData || employees.length === 0) return;
    
    console.log('🔄 Recalculando todos los empleados...');
    setIsRecalculatingAll(true);
    
    try {
      const updatedEmployees = [...employees];
      
      for (const employee of employees) {
        try {
          // Get all novedades for this employee
          const employeeNovedades = await getEmployeeNovedadesList(employee.id);
          
          // Convert novedades to IBC format
          const novedadesForIBC = convertNovedadesToIBC(employeeNovedades);
          
          // Get period info for days calculation
          const daysInfo = PayrollCalculationService.getDaysInfo({
            tipo_periodo: periodData.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
            fecha_inicio: periodData.fecha_inicio,
            fecha_fin: periodData.fecha_fin
          });

          // Calculate using backend service
          const calculationInput: PayrollCalculationInput = {
            baseSalary: employee.salario_base,
            workedDays: daysInfo.legalDays,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            periodType: daysInfo.periodType === 'quincenal' ? 'quincenal' : 'mensual',
            novedades: novedadesForIBC,
            year: '2025'
          };

          const result = await PayrollCalculationBackendService.calculatePayroll(calculationInput);

          // Update employee in the array
          const employeeIndex = updatedEmployees.findIndex(emp => emp.id === employee.id);
          if (employeeIndex >= 0) {
            updatedEmployees[employeeIndex] = {
              ...updatedEmployees[employeeIndex],
              total_devengado: result.grossPay,
              total_deducciones: result.totalDeductions,
              neto_pagado: result.netPay,
              ibc: result.ibc,
              auxilio_transporte: result.transportAllowance,
              salud_empleado: result.healthDeduction,
              pension_empleado: result.pensionDeduction
            };
          }
        } catch (error) {
          console.error(`❌ Error recalculando empleado ${employee.nombre}:`, error);
        }
      }
      
      // Update all employees at once
      setEmployees(updatedEmployees);
      
      toast({
        title: "Recálculo completado",
        description: `Valores actualizados para ${employees.length} empleados`,
      });
      
      console.log('✅ Recálculo masivo completado');
    } catch (error) {
      console.error('❌ Error en recálculo masivo:', error);
      toast({
        title: "Error en recálculo",
        description: "No se pudieron recalcular todos los valores",
        variant: "destructive",
      });
    } finally {
      setIsRecalculatingAll(false);
    }
  };

  // Load employees for the period
  const loadEmployees = async () => {
    if (!periodId) return;
    
    setIsLoadingEmployees(true);
    try {
      const payrollEmployees = await PayrollHistoryService.getPeriodEmployees(periodId);
      
        // Transform PayrollEmployeeData to ExpandedEmployee format
        const expandedEmployees: ExpandedEmployee[] = payrollEmployees.map((emp: PayrollEmployeeData) => ({
          id: emp.employee_id, // Use employee_id as the main id for novedades lookup
          nombre: emp.nombre,
          apellido: emp.apellido,
          cedula: emp.cedula,
          cargo: emp.cargo,
          eps: emp.eps,
          afp: emp.afp,
          salario_base: emp.salario_base,
          ibc: emp.ibc || 0, // Use stored IBC as source of truth
          dias_trabajados: emp.dias_trabajados,
        total_devengado: emp.total_devengado,
        total_deducciones: emp.total_deducciones,
        neto_pagado: emp.neto_pagado,
        auxilio_transporte: emp.auxilio_transporte,
        salud_empleado: emp.salud_empleado,
        pension_empleado: emp.pension_empleado,
        horas_extra: emp.horas_extra,
        bonificaciones: emp.bonificaciones,
        comisiones: emp.comisiones,
        cesantias: emp.cesantias,
        prima: emp.prima,
        vacaciones: emp.vacaciones,
        incapacidades: emp.incapacidades,
        otros_devengos: emp.otros_devengos,
        descuentos_varios: emp.descuentos_varios,
        retencion_fuente: emp.retencion_fuente,
        payroll_id: emp.id // This is the payroll record id
      }));
      
      setEmployees(expandedEmployees);
      
      // Load pending adjustments from database and sync with session storage
      console.log('🔄 Loading and syncing pending adjustments...');
      const dbPendingAdjustments = await loadPendingFromDatabase();
      
      if (dbPendingAdjustments.length > 0) {
        console.log(`📊 Found ${dbPendingAdjustments.length} pending adjustments, recalculating affected employees...`);
        
        // Get unique employee IDs with pending adjustments
        const affectedEmployeeIds = Array.from(
          new Set(dbPendingAdjustments.map(adj => adj.employee_id))
        ).filter((id): id is string => typeof id === 'string');
        
        // Recalculate each affected employee
        for (const employeeId of affectedEmployeeIds) {
          try {
            await recalculateEmployeeValues(employeeId);
          } catch (error) {
            console.error(`Error recalculating employee ${employeeId}:`, error);
          }
        }
        
        console.log('✅ Persistence adjustments applied to UI');
      }
      
      console.log('✅ Loaded employees from payrolls table:', expandedEmployees.length);
      console.log('Sample employee:', expandedEmployees[0]);
      
      // Auto-recalculate all employees immediately after loading
      if (expandedEmployees.length > 0) {
        console.log('🔄 Starting immediate backend recalculation...');
        recalculateAllEmployees();
      }
      
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados del período",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [periodId]);

  const handleGoBack = () => {
    navigate('/app/payroll-history');
  };

  // Handle adding novedad - detect period state and show appropriate modal
  const handleAddNovedad = (employeeId: string) => {
    const employeeData = employees.find(e => e.id === employeeId);
    setSelectedEmployeeId(employeeId);
    setSelectedEmployeeName(employeeData ? `${employeeData.nombre} ${employeeData.apellido}` : '');
    setShowAdjustmentModal(true);
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    // Navigate to edit novedad
    console.log('Edit novedad:', novedad);
  };

  // Recalculate employee values using backend service
  const recalculateEmployeeValues = async (employeeId: string) => {
    if (!periodData) return;
    
    try {
      console.log('🔄 Recalculando valores para empleado:', employeeId);
      
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        console.warn('⚠️ Employee not found for recalculation:', employeeId);
        return;
      }

      // Get all novedades for this employee (including the newly created one)
      const employeeNovedades = await getEmployeeNovedadesList(employeeId);
      
      // Convert novedades to IBC format
      const novedadesForIBC = convertNovedadesToIBC(employeeNovedades);
      
      // Get period info for days calculation
      const daysInfo = PayrollCalculationService.getDaysInfo({
        tipo_periodo: periodData.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
        fecha_inicio: periodData.fecha_inicio,
        fecha_fin: periodData.fecha_fin
      });

      // Calculate using backend service
      const calculationInput: PayrollCalculationInput = {
        baseSalary: employee.salario_base,
        workedDays: daysInfo.legalDays,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: daysInfo.periodType === 'quincenal' ? 'quincenal' : 'mensual',
        novedades: novedadesForIBC,
        year: '2025'
      };

      const result = await PayrollCalculationBackendService.calculatePayroll(calculationInput);

      // Update employee in local state
      setEmployees(prevEmployees => 
        prevEmployees.map(emp => 
          emp.id === employeeId 
            ? {
                ...emp,
                total_devengado: result.grossPay,
                total_deducciones: result.totalDeductions, 
                neto_pagado: result.netPay,
                ibc: result.ibc,
                auxilio_transporte: result.transportAllowance,
                salud_empleado: result.healthDeduction,
                pension_empleado: result.pensionDeduction
              }
            : emp
        )
      );

      console.log('✅ Valores actualizados para empleado:', employeeId, {
        devengado: result.grossPay,
        deducciones: result.totalDeductions,
        neto: result.netPay,
        ibc: result.ibc
      });

    } catch (error) {
      console.error('❌ Error recalculando valores del empleado:', error);
    }
  };

  const handleNovedadSubmit = async (novedadData: CreateNovedadData): Promise<{ isPending?: boolean } | void> => {
    if (!periodData) return;

    try {
      if (periodData.estado === 'cerrado') {
        // Save to database for closed periods
        const pendingNovedad: PendingNovedad = {
          employee_id: novedadData.empleado_id,
          employee_name: `${employees.find(emp => emp.id === novedadData.empleado_id)?.nombre || ''} ${employees.find(emp => emp.id === novedadData.empleado_id)?.apellido || ''}`.trim(),
          tipo_novedad: novedadData.tipo_novedad,
          valor: novedadData.valor,
          observacion: novedadData.observacion,
          novedadData: novedadData
        };

        // Save to database
        await PendingAdjustmentsService.savePendingAdjustment(pendingNovedad);
        
        // Also add to local state for immediate display
        addPendingNovedad(pendingNovedad);
        
        // Recalculate employee values to show immediate visual impact
        await recalculateEmployeeValues(novedadData.empleado_id);
        
        return { isPending: true };
      } else {
        // Apply immediately for open periods
        await NovedadesEnhancedService.createNovedad(novedadData);
        
        // Refresh novedades
        await refetchNovedades();
        
        // Recalculate affected employee values
        await recalculateEmployeeValues(novedadData.empleado_id);
        
        return { isPending: false };
      }
    } catch (error) {
      console.error('Error submitting novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la novedad",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle successful adjustment application
  const handleAdjustmentSuccess = () => {
    setShowAdjustmentModal(false);
    refetchNovedades();
    loadPeriodDetail();
    
    toast({
      title: "✅ Éxito",
      description: "La novedad se aplicó correctamente",
    });
  };

  // Load period detail data
  const loadPeriodDetail = async () => {
    if (!periodId) return;
    
    try {
      const data = await PayrollHistoryService.getPeriodData(periodId);
      setPeriodData(data);
    } catch (error) {
      console.error('Error reloading period data:', error);
    }
  };

  // Apply pending adjustments with justification
  const handleApplyPendingAdjustments = async (justification: string) => {
    if (!periodId || !periodData || pendingNovedades.length === 0) return;

    try {
      const result = await applyAdjustments(justification, periodData, periodData.company_id);
      
      if (result.success) {
        setShowConfirmModal(false);
        
        // After successful adjustments, recalculate IBC to ensure consistency
        try {
          console.log('🔄 Triggering IBC recalculation after adjustments...');
          await PayrollRecalculationService.recalculateIBC(periodId, periodData.company_id);
          console.log('✅ IBC recalculation completed');
        } catch (ibcError) {
          console.error('⚠️ IBC recalculation failed:', ibcError);
          // Don't fail the whole operation, just log the warning
          toast({
            title: "Ajustes aplicados",
            description: "Los ajustes se aplicaron correctamente, pero hubo un problema al recalcular el IBC",
            variant: "default",
          });
        }
        
        await loadPeriodDetail();
        await loadEmployees(); // Refresh employee data to show updated IBC
        refetchNovedades();
        
        toast({
          title: "Ajustes aplicados correctamente",
          description: `Los ajustes han sido aplicados y el período ha sido reliquidado`,
        });
      }
    } catch (error) {
      console.error('❌ Error applying adjustments:', error);
    }
  };

  // Discard all pending changes
  const handleDiscardChanges = async () => {
    if (!periodId) return;

    try {
      // Clear from database
      await PendingAdjustmentsService.clearPendingAdjustmentsForPeriod(periodId);
      
      // Clear from local state
      clearAllPending();
      
      setShowDiscardModal(false);
      
      toast({
        title: "Ajustes descartados",
        description: "Todos los ajustes pendientes han sido eliminados",
      });
    } catch (error) {
      console.error('Error discarding changes:', error);
      toast({
        title: "Error",
        description: "No se pudieron descartar los ajustes",
        variant: "destructive",
      });
    }
  };

  // Edit mode handlers
  const handleEnterEditMode = async () => {
    if (!periodData) return;
    
    try {
      await enterEditMode(periodData.id, periodData.company_id);
      toast({
        title: "Modo de edición activado",
        description: "Ahora puedes modificar la composición del período",
      });
    } catch (error) {
      console.error('Error entering edit mode:', error);
      toast({
        title: "Error",
        description: "No se pudo activar el modo de edición",
        variant: "destructive",
      });
    }
  };

  const handleApplyCompositionChanges = () => {
    setShowCompositionChangesModal(true);
  };

  const handleDiscardCompositionChanges = async () => {
    try {
      await discardChanges();
      toast({
        title: "Cambios descartados",
        description: "Se han descartado los cambios de composición",
      });
    } catch (error) {
      console.error('Error discarding changes:', error);
      toast({
        title: "Error",
        description: "No se pudieron descartar los cambios",
        variant: "destructive",
      });
    }
  };

  const handleFinalApplyChanges = async (summary: string) => {
    try {
      await applyChanges(summary);
      setShowCompositionChangesModal(false);
      // Reload employees to reflect changes
      await loadEmployees();
      toast({
        title: "Cambios aplicados",
        description: "Los cambios de composición se han aplicado correctamente",
      });
    } catch (error) {
      console.error('Error applying composition changes:', error);
      toast({
        title: "Error",
        description: "No se pudieron aplicar los cambios",
        variant: "destructive",
      });
    }
  };

  // Group novedades by employee (convert to basic PayrollNovedad type)
  const novedadesByEmployee = React.useMemo(() => {
    const grouped: Record<string, PayrollNovedad[]> = {};
    novedades.forEach((novedad) => {
      if (!grouped[novedad.empleado_id]) {
        grouped[novedad.empleado_id] = [];
      }
      // Convert enhanced novedad to basic novedad type
      const basicNovedad: PayrollNovedad = {
        id: novedad.id,
        company_id: novedad.company_id,
        empleado_id: novedad.empleado_id,
        periodo_id: novedad.periodo_id,
        tipo_novedad: novedad.tipo_novedad as any, // Type conversion
        subtipo: novedad.subtipo || '',
        valor: novedad.valor,
        fecha_inicio: novedad.fecha_inicio,
        fecha_fin: novedad.fecha_fin,
        observacion: novedad.observacion || '',
        dias: novedad.dias || 0,
        created_at: novedad.created_at,
        updated_at: novedad.updated_at
      };
      grouped[novedad.empleado_id].push(basicNovedad);
    });
    return grouped;
  }, [novedades]);

  // Format period header
  const formatPeriodHeader = () => {
    if (!periodData) return { title: '', dateRange: '' };
    
    const startDate = new Date(periodData.fecha_inicio);
    const endDate = new Date(periodData.fecha_fin);
    
    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return {
      title: periodData.periodo,
      dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`
    };
  };

  const { title, dateRange } = formatPeriodHeader();

  // Handle changes in employee novedades (e.g., deletion from modal)
  const handleEmployeeNovedadesChange = async (employeeId: string) => {
    console.log('🔄 Employee novedades changed for:', employeeId, 'refreshing UI...');
    // Clear any pending novelties for this employee to sync badges
    removePendingNovedadesForEmployee(employeeId);
    await refetchNovedades();
    // Recalculate employee values to show updated calculations immediately
    await recalculateEmployeeValues(employeeId);
  };

  if (!periodId) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se ha especificado un período válido.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingPeriod || !periodData) {
    return (
      <div className="px-6 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fechaInicio = periodData ? formatDate(periodData.fecha_inicio) : '';
  const fechaFin = periodData ? formatDate(periodData.fecha_fin) : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">
                {fechaInicio} - {fechaFin}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Edit Mode Actions */}
            {editMode.isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddEmployeeModal(true)}
                  disabled={editMode.isLoading}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Agregar Empleados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompositionChangesModal(true)}
                  disabled={editMode.isLoading || !editMode.hasUnsavedChanges}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Ver Cambios
                </Button>
              </>
            )}
            
            {/* Edit Period Button - only for liquidated periods */}
            {!editMode.isActive && periodData.estado === 'cerrado' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterEditMode}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar Composición
              </Button>
            )}
            
            {/* Recalcular Todo Button */}
            <Button 
              variant="outline"
              size="sm"
              onClick={recalculateAllEmployees}
              disabled={isRecalculatingAll || isLoadingEmployees}
              className="flex items-center gap-2"
            >
              {isRecalculatingAll ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {isRecalculatingAll ? "Recalculando..." : "Recalcular Todo"}
            </Button>
            
        </div>
      </div>

      {/* Unified Actions Panel */}
      <div className="px-6">
        <PayrollActionsPanel
          totalPendingCount={totalPendingCount}
          isApplying={isApplying}
          onApplyPendingAdjustments={() => setShowConfirmModal(true)}
          onDiscardPendingAdjustments={() => setShowDiscardModal(true)}
          onApplyCompositionChanges={handleApplyCompositionChanges}
          onDiscardCompositionChanges={handleDiscardCompositionChanges}
          canEdit={periodData?.estado === 'cerrado'}
          periodStatus={periodData?.estado || ''}
        />
      </div>

      {/* Summary Cards */}
        <PeriodSummaryCards
          periodType={periodData.tipo_periodo}
          employeesCount={periodData.empleados_count}
          totalDevengado={periodData.total_devengado}
          totalNeto={periodData.total_neto}
          totalDeducciones={periodData.total_deducciones || 0}
        />
      </div>

      {/* Content Section */}
      <div className="px-6 space-y-6">
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Empleados
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Auditoría
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="employees">
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando empleados...</p>
                </div>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin empleados liquidados</h3>
                <p className="text-sm text-muted-foreground">
                  No hay empleados liquidados en este período.
                </p>
              </div>
            ) : (
        <ExpandedEmployeesTable
          employees={employees}
          novedades={novedadesByEmployee}
          onAddNovedad={handleAddNovedad}
          onEditNovedad={handleEditNovedad}
          canEdit={true}
          pendingNovedades={pendingNovedades}
          getPendingCount={getPendingCount}
          calculateEmployeePreview={calculateEmployeePreview}
          isRecalculatingBackend={isRecalculatingAll}
          periodData={periodData ? {
            ...periodData,
            id: periodId // Add period ID for PDF generation lookup
          } : undefined}
        />
            )}
          </TabsContent>
          
          <TabsContent value="audit">
            <PeriodAuditSummaryComponent 
              periodId={periodId || ''} 
              periodName={periodData?.periodo || ''} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Novedad Modal */}
      <NovedadUnifiedModal
        open={showAdjustmentModal}
        setOpen={setShowAdjustmentModal}
        employeeId={selectedEmployeeId}
        employeeSalary={employees.find(e => e.id === selectedEmployeeId)?.salario_base}
        periodId={periodId}
        onSubmit={handleNovedadSubmit}
        onClose={() => setShowAdjustmentModal(false)}
        onEmployeeNovedadesChange={handleEmployeeNovedadesChange}
        selectedNovedadType={null}
        mode={periodData?.estado === 'cerrado' ? 'ajustes' : 'liquidacion'}
        startDate={periodData?.fecha_inicio}
        endDate={periodData?.fecha_fin}
        companyId={periodData?.company_id || ''}
        currentLiquidatedValues={employees.find(e => e.id === selectedEmployeeId) ? {
          salario_base: employees.find(e => e.id === selectedEmployeeId)!.salario_base,
          ibc: employees.find(e => e.id === selectedEmployeeId)!.ibc,
          dias_trabajados: employees.find(e => e.id === selectedEmployeeId)!.dias_trabajados,
          total_devengado: employees.find(e => e.id === selectedEmployeeId)!.total_devengado,
          total_deducciones: employees.find(e => e.id === selectedEmployeeId)!.total_deducciones,
          neto_pagado: employees.find(e => e.id === selectedEmployeeId)!.neto_pagado
        } : undefined}
      />

      {/* Confirmation Modal for Adjustments */}
      <ConfirmAdjustmentModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApplyPendingAdjustments}
        pendingNovedades={pendingNovedades}
        periodName={periodData?.periodo || ''}
        isLoading={isApplying}
      />

      {/* Discard changes confirmation modal */}
      <AlertDialog open={showDiscardModal} onOpenChange={setShowDiscardModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar todos los ajustes?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todas las {totalPendingCount} novedades pendientes. 
              La nómina volverá a su estado original. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Employee Modal */}
      <AddEmployeeModal 
        periodId={periodId || ''}
        companyId={periodData?.company_id || ''}
      />

      {/* Composition Changes Modal */}
      <CompositionChangesModal 
        onApplyChanges={handleFinalApplyChanges}
      />
    </div>
  );
}

export default function PayrollHistoryDetailPage() {
  return (
    <PayrollEditProvider>
      <PayrollHistoryDetailPageContent />
    </PayrollEditProvider>
  );
}
