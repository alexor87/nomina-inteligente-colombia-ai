import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Plus, Calendar, Users, DollarSign, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedadesUnified } from '@/hooks/usePayrollNovedadesUnified';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { PeriodAuditSummaryComponent } from '@/components/payroll/audit/PeriodAuditSummary';
import { NovedadAuditHistoryModal } from '@/components/payroll/audit/NovedadAuditHistoryModal';
import { ConfirmAdjustmentModal } from '@/components/payroll/corrections/ConfirmAdjustmentModal';
import { PendingNovedadesService, PendingAdjustmentData } from '@/services/PendingNovedadesService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  employee_id: string;
  employee_name: string;
  employee_lastname: string;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  salario_base: number;
}

interface Adjustment {
  id: string;
  employee_id: string;
  employee_name: string;
  concept: string;
  amount: number;
  observations: string;
  created_at: string;
}

interface PendingNovedad {
  employee_id: string;
  employee_name: string;
  tipo_novedad: string;
  valor: number;
  observacion?: string;
  novedadData: CreateNovedadData;
}

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<PeriodDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
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
  
  // Hook para gestionar novedades
  const { createNovedad } = usePayrollNovedadesUnified(periodId || '');

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
          employees!inner(nombre, apellido)
        `)
        .eq('period_id', periodId);
      
      if (payrollError) throw payrollError;
      
      const employeesWithNames = payrollData?.map(p => ({
        id: p.id,
        employee_id: p.employee_id,
        employee_name: p.employees.nombre,
        employee_lastname: p.employees.apellido,
        total_devengado: p.total_devengado || 0,
        total_deducciones: p.total_deducciones || 0,
        neto_pagado: p.neto_pagado || 0,
        salario_base: p.salario_base || 0
      })) || [];
      
      setEmployees(employeesWithNames);

      // Load adjustments using Supabase function
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .rpc('get_period_adjustments', { period_id: periodId });
      
      if (adjustmentsError) {
        console.error('Error loading adjustments:', adjustmentsError);
      } else {
        setAdjustments(adjustmentsData || []);
      }
      
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
      const employeeData = employees.find(e => e.employee_id === employeeId);
      setSelectedEmployeeName(employeeData ? `${employeeData.employee_name} ${employeeData.employee_lastname}` : '');
      setShowAdjustmentModal(true);
      console.log('🔵 Set specific employee data and modal to true');
    } else if (employees.length > 0) {
      // Usar el primer empleado como fallback
      setSelectedEmployeeId(employees[0].employee_id);
      setSelectedEmployeeSalary(employees[0].salario_base);
      setSelectedEmployeeName(`${employees[0].employee_name} ${employees[0].employee_lastname}`);
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
    console.log('🟢 handleNovedadSubmit called with data:', data);
    console.log('🟢 Period estado:', period?.estado);
    console.log('🟢 selectedEmployeeId:', selectedEmployeeId);
    console.log('🟢 Current pendingNovedades length:', pendingNovedades.length);
    
    try {
      // For closed periods, add to pending list instead of applying immediately
      if (period?.estado === 'cerrado') {
        const employeeData = employees.find(e => e.employee_id === selectedEmployeeId);
        console.log('🟢 Found employee data:', employeeData);
        
        const newPendingNovedad: PendingNovedad = {
          employee_id: selectedEmployeeId,
          employee_name: employeeData ? `${employeeData.employee_name} ${employeeData.employee_lastname}` : selectedEmployeeName,
          tipo_novedad: data.tipo_novedad,
          valor: data.valor || 0,
          observacion: data.observacion,
          novedadData: data
        };
        
        console.log('🟢 Creating new pending novedad:', newPendingNovedad);
        setPendingNovedades(prev => {
          const newArray = [...prev, newPendingNovedad];
          console.log('🟢 Updated pendingNovedades array:', newArray);
          return newArray;
        });
        setShowAdjustmentModal(false);
        console.log('🟢 Modal closed, pending novedad added');
        
        toast({
          title: "Novedad agregada",
          description: "La novedad se agregó a la lista de ajustes pendientes",
        });
      } else {
        // For open periods, apply immediately
        console.log('🟢 Applying novedad immediately for open period');
        await createNovedad(data);
        handleAdjustmentSuccess();
      }
    } catch (error) {
      console.error('❌ Error creating novedad:', error);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando detalle del período...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Período no encontrado</h3>
          <p className="text-muted-foreground mb-4">El período solicitado no existe o no tienes permisos para verlo.</p>
          <Button onClick={() => navigate('/app/payroll-history')}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/app/payroll-history')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{period.periodo}</h1>
            <p className="text-muted-foreground">
              {new Date(period.fecha_inicio).toLocaleDateString()} - {new Date(period.fecha_fin).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {/* Show save button for closed periods with pending novelties */}
        {period?.estado === 'cerrado' && pendingNovedades.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="animate-pulse">
              {pendingNovedades.length} novedades pendientes
            </Badge>
            <Button 
              onClick={() => setShowConfirmModal(true)}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              Guardar Novedades
            </Button>
          </div>
        )}
        
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{period.tipo_periodo}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{period.empleados_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devengado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(period.total_devengado)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(period.total_neto)}</div>
            <div className="text-xs text-muted-foreground">
              Deducciones: {formatCurrency(period.total_deducciones)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajustes ({adjustments.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Empleados Liquidados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Empleado</th>
                      <th className="text-left p-4 font-medium">Salario Base</th>
                      <th className="text-left p-4 font-medium">Devengado</th>
                      <th className="text-left p-4 font-medium">Deducciones</th>
                      <th className="text-left p-4 font-medium">Neto Pagado</th>
                      <th className="text-left p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">
                            {employee.employee_name} {employee.employee_lastname}
                          </div>
                        </td>
                        <td className="p-4 font-mono">{formatCurrency(employee.salario_base)}</td>
                        <td className="p-4 font-mono">{formatCurrency(employee.total_devengado)}</td>
                        <td className="p-4 font-mono">{formatCurrency(employee.total_deducciones)}</td>
                        <td className="p-4 font-mono font-semibold">{formatCurrency(employee.neto_pagado)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAdjustmentModal(employee.employee_id, employee.salario_base)}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadVoucher(employee.employee_id, `${employee.employee_name} ${employee.employee_lastname}`)}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Comprobante
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments">
          {adjustments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Ajustes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Fecha</th>
                        <th className="text-left p-4 font-medium">Empleado</th>
                        <th className="text-left p-4 font-medium">Concepto</th>
                        <th className="text-left p-4 font-medium">Valor</th>
                        <th className="text-left p-4 font-medium">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((adjustment) => (
                        <tr key={adjustment.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            {new Date(adjustment.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">{adjustment.employee_name}</td>
                          <td className="p-4">{adjustment.concept}</td>
                          <td className="p-4 font-mono">
                            <span className={adjustment.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(adjustment.amount)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {adjustment.observations || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plus className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay ajustes registrados</h3>
                <p className="text-gray-500 text-center mb-4">
                  Los ajustes realizados a los empleados aparecerán aquí
                </p>
                <Button
                  onClick={() => handleOpenAdjustmentModal()}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear primer ajuste
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <PeriodAuditSummaryComponent 
            periodId={periodId || ''} 
            periodName={period.periodo} 
          />
        </TabsContent>
      </Tabs>

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