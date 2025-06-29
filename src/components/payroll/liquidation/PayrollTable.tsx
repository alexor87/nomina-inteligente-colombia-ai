import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { Edit, Calculator, FileText, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { NovedadDrawer } from '../novedades/NovedadDrawer';
import { useNovedades } from '@/hooks/useNovedades';
import { CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

interface PayrollTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, updates: Partial<PayrollEmployee>) => void;
  onRecalculate: () => void;
  isLoading: boolean;
  canEdit: boolean;
  periodoId: string;
  onRefreshEmployees?: () => void;
  onDeleteEmployee?: (id: string) => void;
  onDeleteMultipleEmployees?: (ids: string[]) => void;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  employees,
  onUpdateEmployee,
  onRecalculate,
  isLoading,
  canEdit,
  periodoId,
  onRefreshEmployees,
  onDeleteEmployee,
  onDeleteMultipleEmployees
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const { toast } = useToast();

  const {
    loadNovedadesForEmployee,
    createNovedad,
    updateNovedad,
    deleteNovedad,
    getEmployeeNovedades,
    getEmployeeNovedadesCount,
    isLoading: novedadesLoading
  } = useNovedades(periodoId);

  const handleOpenNovedades = async (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    await loadNovedadesForEmployee(employee.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedEmployee(null);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    console.log('Creating novedad without auto-recalculation');
    
    const createData: CreateNovedadData = {
      ...data,
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId
    };
    
    await createNovedad(createData, true);
  };

  const handleUpdateNovedad = async (id: string, data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    console.log('Updating novedad without auto-recalculation');
    await updateNovedad(id, data, selectedEmployee.id, true);
  };

  const handleDeleteNovedad = async (id: string) => {
    if (!selectedEmployee) return;
    
    console.log('Deleting novedad without auto-recalculation');
    await deleteNovedad(id, selectedEmployee.id, true);
  };

  const handleRecalculatePayroll = () => {
    console.log('🔄 Recalculando nómina desde NovedadDrawer');
    onRecalculate();
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleDeleteEmployee = (employeeId: string) => {
    if (onDeleteEmployee) {
      onDeleteEmployee(employeeId);
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado de la nómina."
      });
    }
  };

  const handleDeleteMultiple = () => {
    if (onDeleteMultipleEmployees && selectedEmployees.length > 0) {
      onDeleteMultipleEmployees(selectedEmployees);
      setSelectedEmployees([]);
      toast({
        title: "Empleados eliminados",
        description: `Se eliminaron ${selectedEmployees.length} empleados de la nómina.`
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      case 'warning':
        return <Clock className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        {/* Bulk actions bar */}
        {selectedEmployees.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedEmployees.length} empleado{selectedEmployees.length > 1 ? 's' : ''} seleccionado{selectedEmployees.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                  className="text-gray-600"
                >
                  Deseleccionar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!canEdit}
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar seleccionados</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar empleados seleccionados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará {selectedEmployees.length} empleado{selectedEmployees.length > 1 ? 's' : ''} de la nómina actual. 
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteMultiple} className="bg-red-600 hover:bg-red-700">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left p-4 w-12">
                  <Checkbox
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={!canEdit}
                  />
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Empleado</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Salario Base</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Días</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Devengado</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Deducciones</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600">Neto</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Estado</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Novedades</th>
                <th className="text-center p-4 text-sm font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-gray-50 hover:bg-gray-25">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                      disabled={!canEdit}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{employee.name}</span>
                      <span className="text-sm text-gray-500">{employee.position}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-sm">
                    {formatCurrency(employee.baseSalary)}
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-medium">{employee.workedDays}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm font-medium text-green-700">
                        {formatCurrency(employee.grossPay)}
                      </span>
                      {employee.bonuses > 0 && (
                        <span className="text-xs text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{formatCurrency(employee.bonuses)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm font-medium text-red-700">
                        {formatCurrency(employee.deductions)}
                      </span>
                      {employee.absences > 0 && (
                        <span className="text-xs text-red-600 flex items-center">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {employee.absences} días
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {formatCurrency(employee.netPay)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Badge className={`${getStatusColor(employee.status)} border-0 text-xs`}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(employee.status)}
                        <span className="capitalize">{employee.status}</span>
                      </span>
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNovedades(employee)}
                      className="text-xs h-7 px-2"
                      disabled={!canEdit}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {getEmployeeNovedadesCount(employee.id) || 0}
                    </Button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenNovedades(employee)}
                        className="h-7 w-7 p-0"
                        disabled={!canEdit}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          console.log('Recalculating for employee:', employee.id);
                          onRecalculate();
                        }}
                        className="h-7 w-7 p-0"
                        disabled={isLoading}
                      >
                        <Calculator className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            disabled={!canEdit}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará a {employee.name} de la nómina actual. 
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Novedad Drawer */}
      {selectedEmployee && (
        <NovedadDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          employeeName={selectedEmployee.name}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          novedades={getEmployeeNovedades(selectedEmployee.id)}
          onCreateNovedad={handleCreateNovedad}
          onUpdateNovedad={handleUpdateNovedad}
          onDeleteNovedad={handleDeleteNovedad}
          isLoading={novedadesLoading}
          canEdit={canEdit}
          onRecalculatePayroll={handleRecalculatePayroll}
        />
      )}
    </>
  );
};
