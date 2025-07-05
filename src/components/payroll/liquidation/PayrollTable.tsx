import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { MoreHorizontal, ArrowDown, ArrowUp, Copy, UserPlus, FileText, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { useNovedades } from '@/hooks/useNovedades';
import { usePayrollNovedades } from '@/hooks/usePayrollNovedades';
import { PayrollEmployee } from '@/types/payroll';
import { CreateNovedadData } from '@/types/novedades-enhanced';

interface PayrollTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, updates: Partial<PayrollEmployee>) => void;
  onRecalculate: () => Promise<void>;
  isLoading: boolean;
  canEdit: boolean;
  periodoId: string;
  onRefreshEmployees?: () => Promise<void>;
  onDeleteEmployee?: (employeeId: string) => Promise<void>;
  period?: {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    tipo_periodo: string;
  };
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, horas?: number, dias?: number) => number | null;
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
  period,
  calculateSuggestedValue
}) => {
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);

  const { createNovedad } = useNovedades(periodoId);
  const { refreshEmployeeNovedades } = usePayrollNovedades(periodoId);

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!selectedEmployee) return;
    
    console.log('📝 PayrollTable - Creating novedad with data:', data);
    
    const novedadData: CreateNovedadData = {
      empleado_id: selectedEmployee.id,
      periodo_id: periodoId,
      ...data
    };
    
    await createNovedad(novedadData);
    
    // Refresh novedades after creating
    if (refreshEmployeeNovedades) {
      await refreshEmployeeNovedades(selectedEmployee.id);
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  if (employees.length === 0) {
    return (
      <div className="bg-white min-h-96">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No hay empleados
          </h3>
          <p className="text-gray-500 mb-8 text-center max-w-md">
            Para liquidar nómina debes tener empleados registrados
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Lista de empleados para el período actual.
          </h3>
          <Input
            type="search"
            placeholder="Buscar empleado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Empleado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Cargo</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Salario</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Novedades</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{employee.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={`https://avatar.vercel.sh/${employee.name}`} />
                          <AvatarFallback>{employee.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{employee.position}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(employee.baseSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setIsNovedadModalOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Gestionar
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>
                            Ver historial <ArrowDown className="ml-auto h-4 w-4" />
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Previsualizar <ArrowUp className="ml-auto h-4 w-4" />
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            Confirmar pago <Copy className="ml-auto h-4 w-4" />
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Descargar recibo <UserPlus className="ml-auto h-4 w-4" />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-gray-500">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <NovedadUnifiedModal
          open={isNovedadModalOpen}
          setOpen={setIsNovedadModalOpen}
          employeeId={selectedEmployee.id}
          employeeSalary={selectedEmployee.baseSalary}
          onSubmit={handleCreateNovedad}
          selectedNovedadType={null}
          onClose={() => {
            setIsNovedadModalOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </>
  );
};
