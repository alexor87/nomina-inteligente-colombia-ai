import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { VoucherExistsBanner } from '@/components/payroll-history/VoucherExistsBanner';
import { NovedadCountBadge } from '@/components/payroll-history/NovedadCountBadge';
import { PeriodEmployeesTable } from '@/components/payroll-history/PeriodEmployeesTable';
import { NovedadDrawer } from '@/components/payroll/novedades/NovedadDrawer';
import { DevengoModal } from '@/components/payroll-history/DevengoModal';
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

interface SelectedEmployeeData {
  employeeId: string;
  payrollId: string;
  name: string;
  salary: number;
}

export const PeriodEditPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hasVouchers, setHasVouchers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SelectedEmployeeData | null>(null);
  const [editingNovedad, setEditingNovedad] = useState<PayrollNovedad | null>(null);
  const [showNovedadDrawer, setShowNovedadDrawer] = useState(false);
  const [showDevengoModal, setShowDevengoModal] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [novedadesCounts, setNovedadesCounts] = useState<Record<string, number>>({});

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

  const loadNovedadesCounts = async (employeeIds: string[], companyId: string) => {
    try {
      const { data: novedadesData } = await supabase
        .from('payroll_novedades')
        .select('empleado_id')
        .eq('company_id', companyId)
        .in('empleado_id', employeeIds);

      const counts: Record<string, number> = {};
      (novedadesData || []).forEach(nov => {
        counts[nov.empleado_id] = (counts[nov.empleado_id] || 0) + 1;
      });

      setNovedadesCounts(counts);
    } catch (error) {
      console.error('Error loading novedades counts:', error);
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

      // Load novedades counts for employees
      await loadNovedadesCounts(formattedEmployees.map(emp => emp.id), companyId);

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
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el empleado seleccionado",
        variant: "destructive"
      });
      return;
    }

    // Validar que el payroll_id sea un UUID válido
    const isValidUUID = (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    if (!employee.payroll_id || !isValidUUID(employee.payroll_id)) {
      console.error('❌ Invalid payroll_id for employee:', {
        employeeId,
        payrollId: employee.payroll_id,
        employee
      });
      
      toast({
        title: "Error de configuración",
        description: `No se encontró un ID de nómina válido para el empleado ${employee.nombre} ${employee.apellido}`,
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Valid payroll_id found for employee:', {
      employeeId,
      payrollId: employee.payroll_id,
      employeeName: `${employee.nombre} ${employee.apellido}`,
      isValidUUID: isValidUUID(employee.payroll_id)
    });

    setSelectedEmployeeData({
      employeeId: employeeId,
      payrollId: employee.payroll_id, // Este es el UUID real del payroll del empleado
      name: `${employee.nombre} ${employee.apellido}`,
      salary: employee.salario_base
    });

    setEditingNovedad(null);
    setShowDevengoModal(true);
  };

  const handleEditNovedad = (novedad: PayrollNovedad) => {
    const employee = employees.find(emp => emp.id === novedad.empleado_id);
    if (!employee) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el empleado de la novedad",
        variant: "destructive"
      });
      return;
    }

    setSelectedEmployeeData({
      employeeId: novedad.empleado_id,
      payrollId: employee.payroll_id,
      name: `${employee.nombre} ${employee.apellido}`,
      salary: employee.salario_base
    });

    setEditingNovedad(novedad);
    setShowNovedadDrawer(true);
  };

  const handleCreateNovedadFromModal = async (employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => {
    console.log('✅ Novedad created successfully from modal:', { employeeId, valor, tipo });
    
    // Close the modal
    setShowDevengoModal(false);
    setSelectedEmployeeData(null);
    
    // Reload period data to refresh totals and counts
    await loadPeriodData();
    
    toast({
      title: "✅ Novedad agregada",
      description: `Se ha agregado correctamente la novedad de ${tipo}`,
    });
  };

  const getTotalNovedadesCount = () => {
    return Object.values(novedadesCounts).reduce((total, count) => total + count, 0);
  };

  const getEmployeeNovedadesCount = (employeeId: string): number => {
    return novedadesCounts[employeeId] || 0;
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
              novedades={{}} // Empty since we're not using the hook here anymore
              onAddNovedad={handleAddNovedad}
              onEditNovedad={handleEditNovedad}
              canEdit={canEdit}
              getEmployeeNovedadesCount={getEmployeeNovedadesCount}
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
      {showNovedadDrawer && selectedEmployeeData && (
        <NovedadDrawer
          isOpen={showNovedadDrawer}
          onClose={() => {
            setShowNovedadDrawer(false);
            setSelectedEmployeeData(null);
            setEditingNovedad(null);
          }}
          employeeName={selectedEmployeeData.name}
          employeeId={selectedEmployeeData.employeeId}
          employeeSalary={selectedEmployeeData.salary}
          novedades={[]} // Empty since we're managing this differently now
          onCreateNovedad={async () => {}} // Will be handled by the drawer internally
          onUpdateNovedad={async () => {}} // Will be handled by the drawer internally
          onDeleteNovedad={async () => {}} // Will be handled by the drawer internally
          canEdit={canEdit}
        />
      )}

      {/* Devengo Modal */}
      {showDevengoModal && selectedEmployeeData && (
        <DevengoModal
          isOpen={showDevengoModal}
          onClose={() => {
            setShowDevengoModal(false);
            setSelectedEmployeeData(null);
          }}
          employeeId={selectedEmployeeData.employeeId}
          employeeName={selectedEmployeeData.name}
          employeeSalary={selectedEmployeeData.salary}
          payrollId={selectedEmployeeData.payrollId} // Pasando el UUID real del payroll
          onNovedadCreated={handleCreateNovedadFromModal}
        />
      )}
    </div>
  );
};
