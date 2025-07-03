import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  MoreHorizontal,
  Edit3
} from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NovedadUnifiedModal } from './novedades/NovedadUnifiedModal';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { calcularValorNovedadEnhanced } from '@/types/novedades-enhanced';

interface PayrollTableNewProps {
  employees: PayrollEmployee[];
  onRemoveEmployee: (employeeId: string) => void;
  onCreateNovedad: (employeeId: string, data: CreateNovedadData) => void;
  onRecalculate?: () => Promise<void>; // ✅ Nuevo prop para recálculo
  periodId: string;
  canEdit: boolean;
  selectedEmployees: string[];
  onToggleEmployee: (employeeId: string) => void;
  onToggleAll: () => void;
}

export const PayrollTableNew: React.FC<PayrollTableNewProps> = ({
  employees,
  onRemoveEmployee,
  onCreateNovedad,
  onRecalculate, // ✅ Nuevo prop
  periodId,
  canEdit,
  selectedEmployees,
  onToggleEmployee,
  onToggleAll
}) => {
  const [showNovedadModal, setShowNovedadModal] = useState(false);
  const [selectedEmployeeForNovedad, setSelectedEmployeeForNovedad] = useState<PayrollEmployee | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false); // ✅ Estado para indicador

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenNovedadModal = (employee: PayrollEmployee) => {
    setSelectedEmployeeForNovedad(employee);
    setShowNovedadModal(true);
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (selectedEmployeeForNovedad) {
      await onCreateNovedad(selectedEmployeeForNovedad.id, data);
      setShowNovedadModal(false);
      setSelectedEmployeeForNovedad(null);
      
      // ✅ Recalcular automáticamente después de crear novedad
      if (onRecalculate) {
        setIsRecalculating(true);
        try {
          await onRecalculate();
        } finally {
          setIsRecalculating(false);
        }
      }
    }
  };

  // ✅ Nuevo callback para cuando se modifiquen/eliminen novedades
  const handleNovedadChange = async () => {
    if (onRecalculate) {
      setIsRecalculating(true);
      console.log('🔄 Recalculando liquidación tras cambio en novedades...');
      try {
        await onRecalculate();
        console.log('✅ Recálculo completado');
      } catch (error) {
        console.error('❌ Error en recálculo:', error);
      } finally {
        setIsRecalculating(false);
      }
    }
  };

  const calculateSuggestedValue = (
    tipo: string,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    if (!selectedEmployeeForNovedad) return null;
    
    console.log('🧮 PayrollTableNew - Calculating suggested value:', {
      tipo,
      subtipo,
      horas,
      dias,
      employeeSalary: selectedEmployeeForNovedad.baseSalary
    });
    
    try {
      const fechaPeriodo = new Date();
      const result = calcularValorNovedadEnhanced(
        tipo as any,
        subtipo,
        selectedEmployeeForNovedad.baseSalary,
        dias,
        horas,
        fechaPeriodo
      );
      
      console.log(`💰 Calculation result: $${Math.round(result.valor).toLocaleString()}`);
      return Math.round(result.valor);
    } catch (error) {
      console.error('❌ Error calculating suggested value:', error);
      return null;
    }
  };

  const allSelected = employees.length > 0 && selectedEmployees.length === employees.length;
  const someSelected = selectedEmployees.length > 0 && selectedEmployees.length < employees.length;

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* ✅ Indicador de recálculo */}
        {isRecalculating && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Recalculando liquidación...</span>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleAll}
                  ref={(el) => {
                    if (el) {
                      const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }
                  }}
                />
              </TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-right">Salario Base</TableHead>
              <TableHead className="text-center">Novedades</TableHead>
              <TableHead className="text-right">Neto a Pagar</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id} className="hover:bg-gray-50">
                <TableCell>
                  <Checkbox
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => onToggleEmployee(employee.id)}
                  />
                </TableCell>
                
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <p className="text-sm text-gray-500">{employee.position}</p>
                  </div>
                </TableCell>
                
                <TableCell className="text-right">
                  <span className="font-medium">
                    {formatCurrency(employee.baseSalary)}
                  </span>
                </TableCell>
                
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenNovedadModal(employee)}
                    className="h-8 w-8 p-0 rounded-full border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-blue-500" />
                  </Button>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(employee.netPay)}
                    </div>
                    {employee.bonuses > 0 && (
                      <div className="text-xs text-green-600">
                        +{formatCurrency(employee.bonuses)}
                      </div>
                    )}
                    {employee.deductions > 0 && (
                      <div className="text-xs text-red-600">
                        -{formatCurrency(employee.deductions)}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleOpenNovedadModal(employee)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Gestionar Novedades
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => onRemoveEmployee(employee.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Quitar del período
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedEmployeeForNovedad && (
        <NovedadUnifiedModal
          isOpen={showNovedadModal}
          onClose={() => {
            setShowNovedadModal(false);
            setSelectedEmployeeForNovedad(null);
          }}
          employeeName={selectedEmployeeForNovedad.name}
          employeeId={selectedEmployeeForNovedad.id}
          employeeSalary={selectedEmployeeForNovedad.baseSalary}
          periodId={periodId}
          onCreateNovedad={handleCreateNovedad}
          onNovedadChange={handleNovedadChange} // ✅ Nuevo callback
          calculateSuggestedValue={calculateSuggestedValue}
        />
      )}
    </>
  );
};
