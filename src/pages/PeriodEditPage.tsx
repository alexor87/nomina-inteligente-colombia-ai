import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { VoucherExistsBanner } from '@/components/payroll-history/VoucherExistsBanner';
import { NovedadCountBadge } from '@/components/payroll-history/NovedadCountBadge';
import { PeriodEmployeesTable } from '@/components/payroll-history/PeriodEmployeesTable';
import { NovedadDrawer } from '@/components/payroll/novedades/NovedadDrawer';
import { useNovedades } from '@/hooks/useNovedades';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad, NovedadFormData } from '@/types/novedades';
import { formatPeriodDateRange } from '@/utils/periodDateUtils';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
  neto_pagado: number;
  payroll_id: string;
}

interface PeriodData {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  payroll_ids: string[];
}

export const PeriodEditPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hasVouchers, setHasVouchers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editingNovedad, setEditingNovedad] = useState<PayrollNovedad | null>(null);
  const [showNovedadDrawer, setShowNovedadDrawer] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Get the actual payroll ID for the selected employee
  const actualPayrollId = employees.find(emp => emp.id === selectedEmployeeId)?.payroll_id || null;

  const {
    novedades,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    loadNovedadesForEmployee,
    getEmployeeNovedadesCount
  } = useNovedades(actualPayrollId || '', () => {
    // Trigger recalculation when novedades change
    loadPeriodData();
  });

  useEffect(() => {
    if (periodId) {
      loadPeriodData();
      checkUserPermissions();
    }
  }, [periodId]);

  const checkUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanEdit(false);
        return;
      }

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        setCanEdit(false);
        return;
      }

      // Check if user is superadmin or has admin role
      const isSuperAdmin = user.email === 'alexor87@gmail.com';
      
      if (isSuperAdmin) {
        setCanEdit(true);
        return;
      }

      // Check if user has admin role in company
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .in('role', ['administrador', 'rrhh']);

      setCanEdit(userRoles && userRoles.length > 0);
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setCanEdit(false);
    }
  };

  const getCurrentUserCompanyId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  };

  const loadPeriodData = async () => {
    try {
      setIsLoading(true);
      const companyId = await getCurrentUserCompanyId();
      if (!companyId || !periodId) return;

      console.log('🔍 Loading period data for periodId:', periodId);

      // For artificial IDs like "period-0", get the most recent period
      let targetPeriod: string | null = null;

      if (periodId.startsWith('period-')) {
        // Get available periods to find the target one
        const { data: periodsData, error: periodsError } = await supabase
          .from('payrolls')
          .select('periodo')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (periodsError || !periodsData || periodsData.length === 0) {
          console.error('Error loading periods:', periodsError);
          toast({
            title: "Error",
            description: "No se pudieron cargar los períodos",
            variant: "destructive"
          });
          return;
        }

        // Get unique periods and select the first one (most recent)
        const uniquePeriods = [...new Set(periodsData.map(p => p.periodo))];
        
        // Extract the index from periodId (e.g., "period-0" -> 0)
        const periodIndex = parseInt(periodId.split('-')[1]) || 0;
        targetPeriod = uniquePeriods[periodIndex] || uniquePeriods[0];
      } else {
        // Assume periodId is the actual period name
        targetPeriod = periodId;
      }

      if (!targetPeriod) {
        toast({
          title: "Error",
          description: "No se encontró el período solicitado",
          variant: "destructive"
        });
        return;
      }

      console.log('🎯 Target period:', targetPeriod);

      // Load all payrolls for this period
      const { data: payrollsData, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          periodo,
          estado,
          salario_base,
          neto_pagado,
          created_at,
          employees (
            nombre,
            apellido
          )
        `)
        .eq('company_id', companyId)
        .eq('periodo', targetPeriod);

      if (payrollsError) {
        console.error('Error loading payrolls:', payrollsError);
        toast({
          title: "Error",
          description: "Error al cargar los datos del período",
          variant: "destructive"
        });
        return;
      }

      if (!payrollsData || payrollsData.length === 0) {
        console.log('⚠️ No payrolls found for period:', targetPeriod);
        toast({
          title: "Error",
          description: "No se encontraron datos para el período seleccionado",
          variant: "destructive"
        });
        return;
      }

      console.log('📊 Found payrolls:', payrollsData);

      // Create period data with real payroll IDs
      const periodData: PeriodData = {
        id: periodId, // Keep the URL ID for navigation
        periodo: targetPeriod,
        fecha_inicio: payrollsData[0].created_at.split('T')[0],
        fecha_fin: payrollsData[0].created_at.split('T')[0],
        estado: payrollsData[0].estado || 'borrador',
        payroll_ids: payrollsData.map(p => p.id)
      };
      setPeriod(periodData);

      // Format employees with their real payroll IDs
      const formattedEmployees: Employee[] = payrollsData.map(payroll => ({
        id: payroll.employee_id,
        nombre: payroll.employees?.nombre || '',
        apellido: payroll.employees?.apellido || '',
        salario_base: Number(payroll.salario_base || 0),
        neto_pagado: Number(payroll.neto_pagado || 0),
        payroll_id: payroll.id // This is the real UUID we need
      }));

      setEmployees(formattedEmployees);
      console.log('👥 Employees with real payroll IDs:', formattedEmployees);

      // Load novedades for each employee using their real payroll IDs
      formattedEmployees.forEach(emp => {
        if (emp.payroll_id) {
          console.log('📋 Loading novedades for employee:', emp.id, 'payroll ID:', emp.payroll_id);
          loadNovedadesForEmployee(emp.id);
        }
      });

      // Check for existing vouchers
      const { data: vouchersData } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .eq('company_id', companyId)
        .eq('periodo', targetPeriod)
        .eq('voucher_status', 'vigente')
        .limit(1);

      setHasVouchers((vouchersData?.length || 0) > 0);

    } catch (error) {
      console.error('Error loading period data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNovedad = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEditingNovedad(null);
    setShowNovedadDrawer(true);
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    setSelectedEmployeeId(novedad.empleado_id);
    setEditingNovedad(novedad);
    setShowNovedadDrawer(true);
  };

  const handleCreateNovedad = async (data: NovedadFormData) => {
    if (!selectedEmployeeId || !actualPayrollId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el empleado o período seleccionado",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log('🔄 Creating novedad with real payroll ID:', actualPayrollId);
      
      const completeData = {
        ...data,
        empleado_id: selectedEmployeeId,
        periodo_id: actualPayrollId // Use the real UUID
      };
      
      await createNovedad(completeData);
      
      toast({
        title: "✅ Cambios guardados",
        description: "La novedad se ha registrado correctamente"
      });
      
      setShowNovedadDrawer(false);
      setSelectedEmployeeId(null);
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad",
        variant: "destructive"
      });
    }
  };

  const handleUpdateNovedad = async (id: string, data: NovedadFormData) => {
    if (!selectedEmployeeId) return;
    
    try {
      await updateNovedad(id, data, selectedEmployeeId);
      
      toast({
        title: "✅ Cambios guardados",
        description: "La novedad se ha actualizado correctamente"
      });
      
      setShowNovedadDrawer(false);
      setEditingNovedad(null);
      setSelectedEmployeeId(null);
    } catch (error) {
      console.error('Error updating novedad:', error);
    }
  };

  const handleDeleteNovedad = async (id: string) => {
    if (!selectedEmployeeId) return;
    
    try {
      await deleteNovedad(id, selectedEmployeeId);
      
      toast({
        title: "✅ Cambios guardados",
        description: "La novedad se ha eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting novedad:', error);
    }
  };

  const getTotalNovedadesCount = () => {
    return employees.reduce((total, emp) => total + getEmployeeNovedadesCount(emp.id), 0);
  };

  const getSelectedEmployee = () => {
    return employees.find(emp => emp.id === selectedEmployeeId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Período no encontrado</h2>
          <p className="text-gray-600 mb-4">El período solicitado no existe o no tienes permisos para verlo.</p>
          <Button onClick={() => navigate('/app/payroll-history')}>
            Volver al Historial
          </Button>
        </div>
      </div>
    );
  }

  const selectedEmployee = getSelectedEmployee();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/app/payroll-history')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Historial
              </Button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {formatPeriodDateRange(period.fecha_inicio, period.fecha_fin)}
                  </h1>
                  <NovedadCountBadge count={getTotalNovedadesCount()} />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Edición de novedades del período • {employees.length} empleados
                </p>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={() => handleAddNovedad(employees[0]?.id || '')}
                disabled={employees.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Novedad
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Banner informativo */}
        <VoucherExistsBanner hasVouchers={hasVouchers} />

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Empleados y Novedades
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PeriodEmployeesTable
              employees={employees}
              novedades={novedades}
              onAddNovedad={handleAddNovedad}
              onEditNovedad={handleEditNovedad}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>

        {/* Navigation Helper */}
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={() => navigate('/app/payroll-history')}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Editar Otro Período
          </Button>
        </div>
      </div>

      {/* Novedad Drawer */}
      {showNovedadDrawer && selectedEmployee && actualPayrollId && (
        <NovedadDrawer
          isOpen={showNovedadDrawer}
          onClose={() => {
            setShowNovedadDrawer(false);
            setSelectedEmployeeId(null);
            setEditingNovedad(null);
          }}
          employeeName={`${selectedEmployee.nombre} ${selectedEmployee.apellido}`}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.salario_base}
          novedades={novedades[selectedEmployee.id] || []}
          onCreateNovedad={handleCreateNovedad}
          onUpdateNovedad={handleUpdateNovedad}
          onDeleteNovedad={handleDeleteNovedad}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};
