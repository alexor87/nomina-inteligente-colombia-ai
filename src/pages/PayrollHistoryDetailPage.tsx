import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, ArrowLeft, Users, History } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { PayrollNovedad as PayrollNovedadEnhanced, CreateNovedadData } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades';
import { PayrollHistoryService, PayrollPeriodData, PayrollEmployeeData } from '@/services/PayrollHistoryService';
import { PeriodSummaryCards } from '@/components/payroll-history/PeriodSummaryCards';
import { ExpandedEmployeesTable } from '@/components/payroll-history/ExpandedEmployeesTable';
import { formatCurrency } from '@/lib/utils';
import { PendingNovedad, PeriodState } from '@/types/pending-adjustments';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { ConfirmAdjustmentModal } from '@/components/payroll/corrections/ConfirmAdjustmentModal';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { PayrollRecalculationService } from '@/services/PayrollRecalculationService';
import { usePendingAdjustments } from '@/hooks/usePendingAdjustments';

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

export default function PayrollHistoryDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<ExpandedEmployee[]>([]);
  const [periodData, setPeriodData] = useState<PayrollPeriodData | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
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
    calculateEmployeePreview
  } = usePendingAdjustments({ 
    periodId: periodId || '', 
    companyId: periodData?.company_id || '' 
  });
  
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

  // Load novedades for the period
  const {
    novedades,
    isLoading: isLoadingNovedades,
    refetch: refetchNovedades,
    createNovedad
  } = usePayrollNovedadesUnified({ 
    companyId: periodData?.company_id, 
    periodId: periodId || '', 
    enabled: !!periodData?.company_id && !!periodId 
  });

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
      
      console.log('✅ Loaded employees from payrolls table:', expandedEmployees.length);
      console.log('Sample employee:', expandedEmployees[0]);
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

  // CORE LOGIC: Differentiate between open and closed periods
  const handleNovedadSubmit = async (data: CreateNovedadData) => {
    try {
      // 🔵 CLOSED PERIOD: Add to pending adjustments
      if (periodData?.estado === 'cerrado') {
        const employeeData = employees.find(e => e.id === selectedEmployeeId);
        
        const newPendingNovedad: PendingNovedad = {
          employee_id: selectedEmployeeId,
          employee_name: employeeData ? `${employeeData.nombre} ${employeeData.apellido}` : selectedEmployeeName,
          tipo_novedad: data.tipo_novedad,
          valor: data.valor || 0,
          observacion: data.observacion,
          novedadData: data
        };
        
        addPendingNovedad(newPendingNovedad);
        setShowAdjustmentModal(false);
      } else {
        // 🟢 OPEN PERIOD: Apply immediately
        await createNovedad(data);
        handleAdjustmentSuccess();
      }
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
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
        await loadPeriodDetail();
        await loadEmployees(); // Refresh employee data to show updated IBC
        refetchNovedades();
      }
    } catch (error) {
      console.error('❌ Error applying adjustments:', error);
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
          
          {/* Botón de novedades pendientes (solo si hay) */}
          {totalPendingCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="animate-pulse">
                {totalPendingCount} novedades pendientes
              </Badge>
              <Button 
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
                onClick={() => setShowConfirmModal(true)}
                disabled={isApplying}
              >
                {isApplying ? "Aplicando..." : "Aplicar Ajustes"}
              </Button>
            </div>
          )}
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
              />
            )}
          </TabsContent>
          
          <TabsContent value="audit">
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Auditoría no disponible</h3>
              <p className="text-sm text-muted-foreground">
                Los registros de auditoría estarán disponibles próximamente.
              </p>
            </div>
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
    </div>
  );
}
