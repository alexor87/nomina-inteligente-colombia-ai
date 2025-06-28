
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
}

interface PeriodData {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
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

  const {
    novedades,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    loadNovedadesForEmployee,
    getEmployeeNovedadesCount
  } = useNovedades(periodId || '', () => {
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

      // Load period info from payrolls table
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', periodId)
        .single();

      if (payrollError) {
        console.error('Error loading period:', payrollError);
        toast({
          title: "Error",
          description: "No se pudo cargar el período",
          variant: "destructive"
        });
        return;
      }

      // Set period data
      const periodData: PeriodData = {
        id: payrollData.id,
        periodo: payrollData.periodo,
        fecha_inicio: payrollData.created_at.split('T')[0], // Fallback
        fecha_fin: payrollData.created_at.split('T')[0], // Fallback  
        estado: payrollData.estado
      };
      setPeriod(periodData);

      // Load employees for this period
      const { data: employeesData, error: employeesError } = await supabase
        .from('payrolls')
        .select(`
          employee_id,
          salario_base,
          neto_pagado,
          employees (
            nombre,
            apellido
          )
        `)
        .eq('company_id', companyId)
        .eq('periodo', payrollData.periodo);

      if (employeesError) {
        console.error('Error loading employees:', employeesError);
      } else {
        const formattedEmployees: Employee[] = employeesData?.map(item => ({
          id: item.employee_id,
          nombre: item.employees?.nombre || '',
          apellido: item.employees?.apellido || '',
          salario_base: Number(item.salario_base || 0),
          neto_pagado: Number(item.neto_pagado || 0)
        })) || [];
        setEmployees(formattedEmployees);

        // Load novedades for all employees
        formattedEmployees.forEach(emp => {
          loadNovedadesForEmployee(emp.id);
        });
      }

      // Check for existing vouchers
      const { data: vouchersData } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .eq('company_id', companyId)
        .eq('periodo', payrollData.periodo)
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
    if (!selectedEmployeeId || !periodId) return;
    
    try {
      const completeData = {
        ...data,
        empleado_id: selectedEmployeeId,
        periodo_id: periodId
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
    }
  };

  const handleUpdateNovedad = async (data: NovedadFormData) => {
    if (!editingNovedad || !selectedEmployeeId) return;
    
    try {
      await updateNovedad(editingNovedad.id, data, selectedEmployeeId);
      
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
      {showNovedadDrawer && selectedEmployee && (
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
