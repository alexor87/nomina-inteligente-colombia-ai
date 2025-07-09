import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Filter, FileText, Download, Calculator, Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PayrollPeriodEnhancedService } from '@/services/PayrollPeriodEnhancedService';
import { PayrollCalculationEnhancedService } from '@/services/PayrollCalculationEnhancedService';
import { NovedadType, NOVEDAD_TYPE_LABELS, calcularValorNovedad } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { NovedadUnifiedModal } from './novedades/NovedadUnifiedModal';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriod } from '@/types/payroll-period';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { PayrollNovedadEnhancedService } from '@/services/PayrollNovedadEnhancedService';

interface PayrollTableNewProps {
  periodId: string;
  companyId: string;
  onPeriodRefresh?: () => void;
}

export const PayrollTableNew: React.FC<PayrollTableNewProps> = ({ periodId, companyId, onPeriodRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);
  const [selectedNovedadType, setSelectedNovedadType] = useState<NovedadType | null>(null);
  const [employeeSalary, setEmployeeSalary] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUnified | null>(null);
  const { toast } = useToast();

  // Fetch payroll period details
  const { data: period, isLoading: isPeriodLoading, error: periodError, refetch: refetchPeriod } = useQuery({
    queryKey: ['payroll-period', periodId],
    queryFn: () => PayrollPeriodEnhancedService.getPeriodById(periodId),
    enabled: !!periodId,
  });

  // Fetch employees for the company
  const { data: employeesData, isLoading: isEmployeesLoading, error: employeesError, refetch: refetchEmployees } = useQuery({
    queryKey: ['employees-for-company', companyId],
    queryFn: async () => {
      const result = await EmployeeUnifiedService.getAll();
      return result.data || [];
    },
    enabled: !!companyId,
  });

  const employees = useMemo(() => {
    return (employeesData || []).filter(employee =>
      employee.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.cedula.includes(searchTerm)
    );
  }, [employeesData, searchTerm]);

  // Fetch novedades for the period
  const { data: novedades, isLoading: isNovedadesLoading, error: novedadesError, refetch: refetchNovedades } = useQuery({
    queryKey: ['novedades-for-period', periodId],
    queryFn: () => PayrollNovedadEnhancedService.getNovedadesByPeriodId(periodId),
    enabled: !!periodId,
  });

  useEffect(() => {
    if (period) {
      setStartDate(period.fecha_inicio);
      setEndDate(period.fecha_fin);
    }
  }, [period]);

  const handleOpenNovedadModal = (employeeId: string, employeeSalary: number, type?: NovedadType) => {
    setSelectedEmployeeId(employeeId);
    setEmployeeSalary(employeeSalary);
    setSelectedNovedadType(type || null);
    setIsNovedadModalOpen(true);

    // Find and set the selected employee
    const employee = employees.find(emp => emp.id === employeeId);
    setSelectedEmployee(employee || null);
  };

  const handleCloseNovedadModal = () => {
    setIsNovedadModalOpen(false);
    setSelectedNovedadType(null);
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
  };

  const handleNovedadSubmit = async (data: any) => {
    if (!selectedEmployeeId || !periodId) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado o período",
        variant: "destructive",
      });
      return;
    }

    try {
      // ✅ NUEVO: Enviar también company_id
      const submitData = {
        ...data,
        empleado_id: selectedEmployeeId,
        periodo_id: periodId,
        company_id: companyId
      };

      console.log('Saving novelty:', submitData);
      await PayrollNovedadEnhancedService.createNovedad(submitData);

      toast({
        title: "Novedad guardada",
        description: "La novedad se ha guardado correctamente",
      });

      // Refresh data
      await refetchNovedades();
      await refetchPeriod();
      onPeriodRefresh?.();

    } catch (error: any) {
      console.error("Error creating novedad:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la novedad",
        variant: "destructive",
      });
    } finally {
      handleCloseNovedadModal();
    }
  };

  const handleEmployeeNovedadesChange = async (employeeId: string) => {
    console.log('🔄 Refreshing novedades for employee:', employeeId);
    await refetchNovedades();
    await refetchPeriod();
    onPeriodRefresh?.();
  };

  const getEmployeeNovedades = (employeeId: string): PayrollNovedad[] => {
    return (novedades || []).filter(novedad => novedad.empleado_id === employeeId);
  };

  const calculateEmployeeTotal = (employeeId: string): number => {
    const employeeNovedades = getEmployeeNovedades(employeeId);
    return employeeNovedades.reduce((total, novedad) => total + (novedad.valor || 0), 0);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'activo': 'bg-green-100 text-green-800',
      'inactivo': 'bg-red-100 text-red-800',
      'vacaciones': 'bg-blue-100 text-blue-800',
      'incapacidad': 'bg-yellow-100 text-yellow-800'
    };

    const labels = {
      'activo': 'Activo',
      'inactivo': 'Inactivo',
      'vacaciones': 'Vacaciones',
      'incapacidad': 'Incapacidad'
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (isPeriodLoading || isEmployeesLoading || isNovedadesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (periodError || employeesError || novedadesError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error: {periodError?.message || employeesError?.message || novedadesError?.message}
            <Button onClick={() => { refetchPeriod(); refetchEmployees(); refetchNovedades(); }} className="ml-4">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nómina</h2>
          <p className="text-gray-600">
            Período: {period?.nombre} ({period?.estado})
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lista de Empleados
            <Button onClick={refetchNovedades}>
              <Calculator className="w-4 h-4 mr-2" />
              Recalcular
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Empleado</th>
                  <th className="text-left p-4">Cédula</th>
                  <th className="text-left p-4">Cargo</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Novedades</th>
                  <th className="text-left p-4">Total</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </div>
                    </td>
                    <td className="p-4">{employee.cedula}</td>
                    <td className="p-4">{employee.cargo || 'No especificado'}</td>
                    <td className="p-4">{getStatusBadge(employee.estado)}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {getEmployeeNovedades(employee.id).map(novedad => (
                          <Badge key={novedad.id} variant="secondary">
                            {NOVEDAD_TYPE_LABELS[novedad.tipo_novedad]} +{formatCurrency(novedad.valor || 0)}
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenNovedadModal(employee.id, employee.salarioBase)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Novedad
                        </Button>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-green-600">
                      {formatCurrency(calculateEmployeeTotal(employee.id))}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenNovedadModal(employee.id, employee.salarioBase)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Novedades
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            Generar Comprobante
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <NovedadUnifiedModal
        open={isNovedadModalOpen}
        setOpen={setIsNovedadModalOpen}
        employeeId={selectedEmployeeId}
        employeeSalary={employeeSalary}
        periodId={periodId}
        onSubmit={handleNovedadSubmit}
        onClose={handleCloseNovedadModal}
        selectedNovedadType={selectedNovedadType}
        onEmployeeNovedadesChange={handleEmployeeNovedadesChange}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
};
