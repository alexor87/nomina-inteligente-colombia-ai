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

// Use PayrollPeriodData from service instead of local interface

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

export default function PayrollHistoryDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<ExpandedEmployee[]>([]);
  const [periodData, setPeriodData] = useState<PayrollPeriodData | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);
  
  // States for pending adjustments logic
  const [pendingNovedades, setPendingNovedades] = useState<PendingNovedad[]>([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);

  // Load novedades for the period
  const {
    novedades,
    isLoading: isLoadingNovedades,
    refetch: refetchNovedades,
    createNovedad
  } = usePayrollNovedadesUnified({ periodId: periodId || '', enabled: !!periodId });

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

  // Load employees for the period
  useEffect(() => {
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
          salario_base: emp.salario_base,
          ibc: PayrollHistoryService.calculateIBC(emp.salario_base, emp.dias_trabajados),
          dias_trabajados: emp.dias_trabajados,
          total_devengado: emp.total_devengado,
          total_deducciones: emp.total_deducciones,
          neto_pagado: emp.neto_pagado,
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
        
        setPendingNovedades(prev => [...prev, newPendingNovedad]);
        setShowAdjustmentModal(false);
        
        toast({
          title: "Novedad agregada",
          description: "La novedad se agregó a la lista de ajustes pendientes",
        });
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
    if (!periodId || pendingNovedades.length === 0) return;

    try {
      setIsApplyingAdjustments(true);

      // Group by employee and apply via service
      const employeeAdjustments = pendingNovedades.reduce((acc, novedad) => {
        if (!acc[novedad.employee_id]) {
          acc[novedad.employee_id] = [];
        }
        acc[novedad.employee_id].push(novedad);
        return acc;
      }, {} as Record<string, PendingNovedad[]>);
      
      for (const [employeeId, novedades] of Object.entries(employeeAdjustments)) {
        const adjustmentData: PendingAdjustmentData = {
          periodId,
          employeeId,
          employeeName: novedades[0].employee_name,
          justification,
          novedades: novedades.map(n => n.novedadData)
        };

        const result = await PendingNovedadesService.applyPendingAdjustments(adjustmentData);
        
        if (!result.success) {
          throw new Error(result.message);
        }
      }

      // Clear pending and reload
      setPendingNovedades([]);
      setShowConfirmModal(false);
      loadPeriodDetail();
      refetchNovedades();
      
      toast({
        title: "✅ Ajustes aplicados",
        description: "Los ajustes se aplicaron correctamente y se regeneraron los comprobantes",
      });

    } catch (error) {
      console.error('❌ Error applying adjustments:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error aplicando ajustes",
        variant: "destructive"
      });
    } finally {
      setIsApplyingAdjustments(false);
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
          {pendingNovedades.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="animate-pulse">
                {pendingNovedades.length} novedades pendientes
              </Badge>
              <Button 
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
                onClick={() => setShowConfirmModal(true)}
                disabled={isApplyingAdjustments}
              >
                {isApplyingAdjustments ? "Aplicando..." : "Aplicar Ajustes"}
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
      />

      {/* Confirmation Modal for Adjustments */}
      <ConfirmAdjustmentModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApplyPendingAdjustments}
        pendingNovedades={pendingNovedades}
        periodName={periodData?.periodo || ''}
        isLoading={isApplyingAdjustments}
      />
    </div>
  );
}
