
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PayrollEmployee } from '@/types/payroll';
import { AlertCircle, CheckCircle, Clock, Users, Plus, Edit3, TrendingUp, Calculator } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NovedadDrawer } from '../novedades/NovedadDrawer';
import { PayrollTableActions } from './PayrollTableActions';
import { useNovedades } from '@/hooks/useNovedades';
import { NovedadFormData } from '@/types/novedades';

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
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle 
  },
  error: { 
    label: 'Error', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: AlertCircle 
  },
  incomplete: { 
    label: 'Incompleto', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
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
  
  const handleNovedadChange = () => {
    console.log('Novedad changed, refreshing employees...');
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
    getEmployeeNovedades
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
    setSelectedEmployee({ id: employeeId, name: employeeName });
    await loadNovedadesForEmployee(employeeId);
  };

  const handleCreateNovedad = async (data: NovedadFormData) => {
    if (!selectedEmployee) return;
    
    await createNovedad({
      ...data,
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId
    });
  };

  const handleUpdateNovedad = async (id: string, data: NovedadFormData) => {
    if (!selectedEmployee) return;
    
    await updateNovedad(id, data, selectedEmployee.id);
  };

  const handleDeleteNovedad = async (id: string) => {
    if (!selectedEmployee) return;
    
    await deleteNovedad(id, selectedEmployee.id);
  };

  const EditableCell = ({ 
    employeeId, 
    field, 
    value, 
    className = "",
    isHighlighted = false
  }: { 
    employeeId: string; 
    field: string; 
    value: number; 
    className?: string;
    isHighlighted?: boolean;
  }) => {
    const cellId = `${employeeId}-${field}`;
    const isEditing = editingCell === cellId;

    if (isEditing) {
      return (
        <Input
          type="number"
          defaultValue={value}
          className="h-8 text-sm"
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`
                cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors
                ${isHighlighted ? 'bg-blue-50 border border-blue-200' : ''}
                ${!canEdit ? 'cursor-not-allowed opacity-60' : 'hover:shadow-sm'}
                ${className}
              `}
              onClick={() => handleCellClick(cellId)}
            >
              <div className="flex items-center space-x-1">
                {canEdit && <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />}
                <span className="font-medium">{formatCurrency(value)}</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canEdit ? 'Haz clic para editar' : 'Solo lectura'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (employees.length === 0) {
    return (
      <div className="mx-6">
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-10 w-10 text-blue-500" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-gray-900">Sin empleados para liquidar</h3>
              <p className="text-gray-600 max-w-md">
                No hay empleados activos disponibles para la liquidación de nómina. 
                Primero debes agregar empleados en el módulo de Empleados.
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/empleados'}
              className="mt-6"
            >
              <Users className="h-5 w-5 mr-2" />
              Ir a Empleados
            </Button>
          </div>
        </Card>
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

      <div className="mx-6 flex-1 overflow-hidden">
        <Card className="h-full flex flex-col shadow-sm">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b-2">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-56 font-semibold">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Empleado</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-40 font-semibold">Cargo</TableHead>
                  <TableHead className="w-36 text-right font-semibold">
                    <div className="flex items-center justify-end space-x-1">
                      <span>Salario Base</span>
                      <Edit3 className="h-3 w-3 text-blue-500" />
                    </div>
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold">
                    <div className="flex items-center justify-center space-x-1">
                      <span>Días</span>
                      <Edit3 className="h-3 w-3 text-blue-500" />
                    </div>
                  </TableHead>
                  <TableHead className="w-28 text-center font-semibold">
                    <div className="flex items-center justify-center space-x-1">
                      <span>H. Extra</span>
                      <Edit3 className="h-3 w-3 text-blue-500" />
                    </div>
                  </TableHead>
                  <TableHead className="w-36 text-right font-semibold">
                    <div className="flex items-center justify-end space-x-1">
                      <span>Bonos</span>
                      <Edit3 className="h-3 w-3 text-blue-500" />
                    </div>
                  </TableHead>
                  <TableHead className="w-40 text-right font-semibold">
                    <div className="flex items-center justify-end space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Devengado</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-40 text-right font-semibold">
                    <div className="flex items-center justify-end space-x-1">
                      <span className="text-red-600">Deducciones</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-40 text-right font-semibold">
                    <div className="flex items-center justify-end space-x-1">
                      <Calculator className="h-4 w-4 text-green-700" />
                      <span className="text-green-700">Neto</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-32 text-center font-semibold">Novedades</TableHead>
                  <TableHead className="w-28 text-center font-semibold">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEmployees.map((employee) => {
                  const config = statusConfig[employee.status];
                  const StatusIcon = config.icon;
                  const novedadesCount = getEmployeeNovedadesCount(employee.id);
                  const hasErrors = employee.status === 'error';
                  
                  return (
                    <TableRow 
                      key={employee.id} 
                      className={`
                        group hover:bg-gray-50 transition-colors
                        ${isLoading ? 'opacity-50' : ''}
                        ${hasErrors ? 'bg-red-50/30' : ''}
                      `}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-12 rounded-full ${hasErrors ? 'bg-red-400' : 'bg-green-400'}`} />
                          <div>
                            <div className="font-semibold text-gray-900">{employee.name}</div>
                            <div className="text-xs text-gray-500">{employee.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {employee.position || 'No definido'}
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          employeeId={employee.id}
                          field="baseSalary"
                          value={employee.baseSalary}
                          isHighlighted={true}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell
                          employeeId={employee.id}
                          field="workedDays"
                          value={employee.workedDays}
                          isHighlighted={true}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell
                          employeeId={employee.id}
                          field="extraHours"
                          value={employee.extraHours}
                          isHighlighted={true}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          employeeId={employee.id}
                          field="bonuses"
                          value={employee.bonuses}
                          isHighlighted={true}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-green-700 bg-green-50 p-2 rounded">
                          {formatCurrency(employee.grossPay)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-red-700 bg-red-50 p-2 rounded">
                          {formatCurrency(employee.deductions)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-green-800 bg-green-100 p-2 rounded border border-green-200">
                          {formatCurrency(employee.netPay)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenNovedades(employee.id, employee.name)}
                          disabled={!canEdit}
                          className="relative hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {novedadesCount > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-600 text-white"
                            >
                              {novedadesCount}
                            </Badge>
                          )}
                          Novedad
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className={`${config.color} flex items-center space-x-2 border`}>
                                <StatusIcon className="h-3 w-3" />
                                <span className="text-xs font-medium">{config.label}</span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {employee.errors.length > 0 ? (
                                <div className="max-w-xs">
                                  <p className="font-medium">Errores encontrados:</p>
                                  <ul className="list-disc list-inside mt-1">
                                    {employee.errors.map((error, index) => (
                                      <li key={index} className="text-xs">{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p>Empleado válido para liquidación</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
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
        />
      )}
    </>
  );
};
