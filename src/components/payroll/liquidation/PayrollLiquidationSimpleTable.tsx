
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Trash2, 
  FileText, 
  Search,
  Loader2,
  AlertCircle 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { useNovedades } from '@/hooks/useNovedades';
import { CreateNovedadData } from '@/types/novedades-enhanced';

interface PayrollLiquidationSimpleTableProps {
  employees: PayrollEmployee[];
  startDate: string;
  endDate: string;
  currentPeriodId: string | undefined;
  onRemoveEmployee: (employeeId: string) => void;
  onEmployeeNovedadesChange: (employeeId: string) => Promise<void>;
}

export const PayrollLiquidationSimpleTable: React.FC<PayrollLiquidationSimpleTableProps> = ({
  employees,
  startDate,
  endDate,
  currentPeriodId,
  onRemoveEmployee,
  onEmployeeNovedadesChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);

  const { createNovedad } = useNovedades(currentPeriodId || '');

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveEmployee = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const confirmMessage = `¿Estás seguro que deseas eliminar a ${employee.name} de esta liquidación?\n\nEsta acción eliminará al empleado permanentemente de este período de nómina.`;
    
    if (window.confirm(confirmMessage)) {
      setRemovingEmployeeId(employeeId);
      try {
        await onRemoveEmployee(employeeId);
      } finally {
        setRemovingEmployeeId(null);
      }
    }
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    console.log('🔄 Abriendo modal de novedades para empleado:', employee.name);
    setSelectedEmployee(employee);
    setIsNovedadModalOpen(true);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee || !currentPeriodId) return;
    
    console.log('📝 Creando novedad con callback de sincronización:', data);
    
    try {
      const novedadData: CreateNovedadData = {
        empleado_id: selectedEmployee.id,
        periodo_id: currentPeriodId,
        ...data
      };
      
      await createNovedad(novedadData);
      
      // ✅ CALLBACK DE SINCRONIZACIÓN - Refrescar novedades del empleado
      console.log('🔄 Ejecutando callback de sincronización para empleado:', selectedEmployee.id);
      await onEmployeeNovedadesChange(selectedEmployee.id);
      
      console.log('✅ Sincronización completada exitosamente');
    } catch (error) {
      console.error('❌ Error en callback de sincronización:', error);
      throw error;
    }
  };

  const handleCloseNovedadModal = async () => {
    console.log('🔄 Cerrando modal de novedades y ejecutando callback final');
    
    // ✅ CALLBACK AL CERRAR - Asegurar sincronización final
    if (selectedEmployee) {
      try {
        await onEmployeeNovedadesChange(selectedEmployee.id);
        console.log('✅ Callback final de sincronización ejecutado');
      } catch (error) {
        console.error('❌ Error en callback final:', error);
      }
    }
    
    setIsNovedadModalOpen(false);
    setSelectedEmployee(null);
  };

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay empleados cargados
        </h3>
        <p className="text-gray-500">
          Selecciona un período para cargar los empleados
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search Header */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar empleado por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredEmployees.length} de {employees.length} empleados
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                    Empleado
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                    Salario Base
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                    Bonificaciones
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                    Deducciones
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                    Neto a Pagar
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr 
                    key={employee.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      removingEmployeeId === employee.id ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${employee.name}`} />
                          <AvatarFallback className="text-xs">
                            {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {employee.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            ID: {employee.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.position}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(employee.baseSalary)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(employee.bonuses)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(employee.deductions)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-bold text-blue-600">
                        {formatCurrency(employee.netPay)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNovedadModal(employee)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Novedades
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={removingEmployeeId === employee.id}
                            >
                              {removingEmployeeId === employee.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemoveEmployee(employee.id)}
                              className="text-red-600 focus:text-red-600"
                              disabled={removingEmployeeId === employee.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Row */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Empleados</div>
              <div className="text-lg font-semibold text-gray-900">
                {filteredEmployees.length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Salarios</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(filteredEmployees.reduce((sum, emp) => sum + emp.baseSalary, 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Bonificaciones</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(filteredEmployees.reduce((sum, emp) => sum + emp.bonuses, 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Neto</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatCurrency(filteredEmployees.reduce((sum, emp) => sum + emp.netPay, 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Novedad Modal with Synchronization Callback */}
      {selectedEmployee && (
        <NovedadUnifiedModal
          open={isNovedadModalOpen}
          setOpen={setIsNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          periodId={currentPeriodId || ''}
          onSubmit={handleCreateNovedad}
          selectedNovedadType={null}
          onClose={handleCloseNovedadModal}
        />
      )}
    </>
  );
};
