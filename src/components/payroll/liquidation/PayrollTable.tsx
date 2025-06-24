import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { AlertCircle, CheckCircle, Clock, Users, Plus, Edit2 } from 'lucide-react';
import { NovedadDrawer } from '../novedades/NovedadDrawer';
import { PayrollTableActions } from './PayrollTableActions';
import { EmployeeDetailsModal } from '@/components/employees/EmployeeDetailsModal';
import { useNovedades } from '@/hooks/useNovedades';
import { useEmployeeList } from '@/hooks/useEmployeeList';
import { NovedadFormData } from '@/types/novedades';
import { LoadingState } from '@/components/ui/LoadingState';

interface PayrollTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, field: string, value: number) => void;
  onRecalculate: () => void;
  isLoading: boolean;
  canEdit?: boolean;
  periodoId?: string;
  onRefreshEmployees?: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  valid: { 
    label: 'Válido', 
    color: 'bg-green-50 text-green-700 border-green-200', 
    icon: CheckCircle 
  },
  error: { 
    label: 'Error', 
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: AlertCircle 
  },
  incomplete: { 
    label: 'Incompleto', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: Clock 
  }
};

export const PayrollTable = ({ 
  employees, 
  onUpdateEmployee, 
  onRecalculate, 
  isLoading, 
  canEdit = true,
  periodoId = '',
  onRefreshEmployees
}: PayrollTableProps) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  
  const { openEmployeeProfile, closeEmployeeProfile, selectedEmployee: employeeForProfile, isEmployeeProfileOpen } = useEmployeeList();
  
  const handleNovedadChange = () => {
    console.log('Novedad changed - triggering refresh');
    if (onRefreshEmployees) {
      onRefreshEmployees();
    }
  };

  const {
    loadNovedadesForEmployee,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    getEmployeeNovedadesCount,
    getEmployeeNovedades,
    isLoading: novedadesLoading
  } = useNovedades(periodoId, handleNovedadChange);

  const validEmployeeCount = employees.filter(emp => emp.status === 'valid').length;
  const displayedEmployees = showOnlyErrors 
    ? employees.filter(emp => emp.status !== 'valid')
    : employees;

  const handleCellEdit = (employeeId: string, field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    onUpdateEmployee(employeeId, field, numericValue);
    setEditingCell(null);
  };

  const handleCellClick = (cellId: string) => {
    if (canEdit) {
      setEditingCell(cellId);
    }
  };

  const handleOpenNovedades = async (employeeId: string, employeeName: string) => {
    console.log('Opening novedades for employee:', employeeId, employeeName);
    setSelectedEmployee({ id: employeeId, name: employeeName });
    await loadNovedadesForEmployee(employeeId);
  };

  const handleEmployeeNameClick = async (employeeId: string) => {
    const payrollEmployee = employees.find(emp => emp.id === employeeId);
    if (!payrollEmployee) return;

    // Create a complete employee object that matches EmployeeWithStatus interface
    const employeeForModal = {
      id: payrollEmployee.id,
      nombre: payrollEmployee.name.split(' ')[0] || '',
      apellido: payrollEmployee.name.split(' ').slice(1).join(' ') || '',
      cedula: payrollEmployee.id,
      tipoDocumento: 'CC' as const,
      email: `${payrollEmployee.name.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
      telefono: '',
      cargo: payrollEmployee.position,
      salarioBase: payrollEmployee.baseSalary,
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'activo' as const,
      tipoContrato: 'indefinido' as const,
      eps: payrollEmployee.eps || '',
      afp: payrollEmployee.afp || '',
      arl: '',
      cajaCompensacion: '',
      estadoAfiliacion: 'completa' as const,
      nivelRiesgoARL: 'I' as const,
      centrosocial: '',
      contratoVencimiento: '',
      ultimaLiquidacion: new Date().toISOString(),
      avatar: '',
      empresaId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    openEmployeeProfile(employeeForModal);
  };

  const handleCreateNovedad = async (data: NovedadFormData) => {
    if (!selectedEmployee) return;
    
    console.log('Creating novedad:', data);
    try {
      await createNovedad({
        ...data,
        empleado_id: selectedEmployee.id,
        periodo_id: periodoId
      });
      console.log('Novedad created successfully');
    } catch (error) {
      console.error('Error creating novedad:', error);
    }
  };

  const handleUpdateNovedad = async (id: string, data: NovedadFormData) => {
    if (!selectedEmployee) return;
    
    console.log('Updating novedad:', id, data);
    try {
      await updateNovedad(id, data, selectedEmployee.id);
      console.log('Novedad updated successfully');
    } catch (error) {
      console.error('Error updating novedad:', error);
    }
  };

  const handleDeleteNovedad = async (id: string) => {
    if (!selectedEmployee) return;
    
    console.log('Deleting novedad:', id);
    try {
      await deleteNovedad(id, selectedEmployee.id);
      console.log('Novedad deleted successfully');
    } catch (error) {
      console.error('Error deleting novedad:', error);
    }
  };

  const EditableCell = ({ 
    employeeId, 
    field, 
    value, 
    className = ""
  }: { 
    employeeId: string; 
    field: string; 
    value: number; 
    className?: string;
  }) => {
    const cellId = `${employeeId}-${field}`;
    const isEditing = editingCell === cellId;

    if (isEditing) {
      return (
        <Input
          type="number"
          defaultValue={value}
          className="h-7 text-sm border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          autoFocus
          onBlur={(e) => handleCellEdit(employeeId, field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCellEdit(employeeId, field, e.currentTarget.value);
            }
            if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
        />
      );
    }

    return (
      <div 
        className={`
          cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors group
          ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}
          ${className}
        `}
        onClick={() => handleCellClick(cellId)}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 text-sm">{formatCurrency(value)}</span>
          {canEdit && <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />}
        </div>
      </div>
    );
  };

  // Show loading state while employees are being loaded
  if (isLoading) {
    return (
      <div className="py-18">
        <LoadingState 
          message="Cargando empleados..." 
          size="lg"
          className="flex-col space-y-4"
        />
      </div>
    );
  }

  // Show empty state only after loading is complete and no employees found
  if (employees.length === 0) {
    return (
      <div className="py-18 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-3">Sin empleados para liquidar</h3>
        <p className="text-gray-500 mb-6 text-base">
          No hay empleados activos. Agrega empleados primero.
        </p>
        <Button 
          onClick={() => window.location.href = '/empleados'}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Users className="h-4 w-4 mr-2" />
          Ir a Empleados
        </Button>
      </div>
    );
  }

  return (
    <>
      <PayrollTableActions
        employeeCount={employees.length}
        validEmployeeCount={validEmployeeCount}
        onRecalculate={onRecalculate}
        isLoading={isLoading}
        canEdit={canEdit}
        showOnlyErrors={showOnlyErrors}
        onToggleErrorFilter={() => setShowOnlyErrors(!showOnlyErrors)}
      />

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                <TableHead className="font-medium text-gray-700 h-10 w-[200px] text-sm px-4">Empleado</TableHead>
                <TableHead className="font-medium text-gray-700 w-[120px] text-sm px-3">Cargo</TableHead>
                <TableHead className="text-right font-medium text-gray-700 w-[100px] text-sm px-3">Salario Base</TableHead>
                <TableHead className="text-center font-medium text-gray-700 w-[60px] text-sm px-3">Días</TableHead>
                <TableHead className="text-right font-medium text-gray-700 text-green-700 w-[100px] text-sm px-3">Devengado</TableHead>
                <TableHead className="text-right font-medium text-gray-700 text-red-700 w-[100px] text-sm px-3">Deducciones</TableHead>
                <TableHead className="text-right font-medium text-gray-700 text-green-800 w-[100px] text-sm px-3">Neto</TableHead>
                <TableHead className="text-center font-medium text-gray-700 w-[90px] text-sm px-3">Novedades</TableHead>
                <TableHead className="text-center font-medium text-gray-700 w-[80px] text-sm px-3">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEmployees.map((employee) => {
                const config = statusConfig[employee.status];
                const StatusIcon = config.icon;
                const novedadesCount = getEmployeeNovedadesCount(employee.id);
                
                return (
                  <TableRow 
                    key={employee.id} 
                    className="hover:bg-gray-50/50 transition-colors border-b border-gray-50"
                  >
                    <TableCell className="py-2 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-1.5 h-5 rounded-full ${employee.status === 'error' ? 'bg-red-400' : 'bg-green-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div 
                            className="font-medium text-gray-900 text-sm cursor-pointer hover:text-blue-600 hover:underline transition-colors truncate"
                            onClick={() => handleEmployeeNameClick(employee.id)}
                            title={employee.name}
                          >
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate" title={employee.id}>
                            {employee.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 py-2 px-3 text-sm">
                      <div className="truncate" title={employee.position || 'No definido'}>
                        {employee.position || 'No definido'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 px-3">
                      <EditableCell
                        employeeId={employee.id}
                        field="baseSalary"
                        value={employee.baseSalary}
                      />
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      <EditableCell
                        employeeId={employee.id}
                        field="workedDays"
                        value={employee.workedDays}
                      />
                    </TableCell>
                    <TableCell className="text-right py-2 px-3">
                      <div className="font-medium text-green-700 px-2 py-1 bg-green-50 rounded text-sm">
                        {formatCurrency(employee.grossPay)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 px-3">
                      <div className="font-medium text-red-700 px-2 py-1 bg-red-50 rounded text-sm">
                        {formatCurrency(employee.deductions)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 px-3">
                      <div className="font-semibold text-green-800 px-2 py-1 bg-green-100 rounded text-sm">
                        {formatCurrency(employee.netPay)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenNovedades(employee.id, employee.name)}
                        disabled={!canEdit || novedadesLoading}
                        className="relative hover:bg-blue-50 h-7 px-2 text-sm font-medium text-gray-700"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {novedadesCount > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-blue-600 text-white border-0"
                          >
                            {novedadesCount}
                          </Badge>
                        )}
                        Novedad
                      </Button>
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      <Badge className={`${config.color} flex items-center space-x-1 border-0 px-2 py-1 w-fit text-sm font-medium`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{config.label}</span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Novedad Drawer */}
      {selectedEmployee && (
        <NovedadDrawer
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employeeName={selectedEmployee.name}
          employeeId={selectedEmployee.id}
          novedades={getEmployeeNovedades(selectedEmployee.id)}
          onCreateNovedad={handleCreateNovedad}
          onUpdateNovedad={handleUpdateNovedad}
          onDeleteNovedad={handleDeleteNovedad}
          canEdit={canEdit}
          isLoading={novedadesLoading}
        />
      )}

      {/* Employee Profile Modal */}
      <EmployeeDetailsModal
        isOpen={isEmployeeProfileOpen}
        onClose={closeEmployeeProfile}
        employee={employeeForProfile}
      />
    </>
  );
};
