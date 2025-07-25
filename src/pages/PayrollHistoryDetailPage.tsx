import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Plus, Calendar, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AdjustmentModalPro } from '@/components/payroll-history/AdjustmentModalPro';

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

export const PayrollHistoryDetailPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<PeriodDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

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
        
        <Button 
          onClick={() => setShowAdjustmentModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Registrar ajuste
        </Button>
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

      {/* Employees Table */}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadVoucher(employee.employee_id, `${employee.employee_name} ${employee.employee_lastname}`)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Comprobante
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments History */}
      {adjustments.length > 0 && (
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
      )}

      {/* Adjustment Modal */}
      <AdjustmentModalPro
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        periodId={periodId!}
        period={period}
        employees={employees}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
};