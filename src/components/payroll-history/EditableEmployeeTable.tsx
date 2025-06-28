import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MoreVertical, 
  Edit, 
  Plus, 
  Trash,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { PayrollHistoryEmployee } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { NovedadModal } from './NovedadModal';

interface EditableEmployeeTableProps {
  employees: PayrollHistoryEmployee[];
  isEditMode: boolean;
  onEmployeeUpdate: (employeeId: string, updates: Partial<PayrollHistoryEmployee>) => void;
  periodId: string;
}

interface EditingCell {
  employeeId: string;
  field: 'grossPay' | 'deductions' | 'netPay';
  value: string;
}

export const EditableEmployeeTable = ({ 
  employees, 
  isEditMode, 
  onEmployeeUpdate,
  periodId 
}: EditableEmployeeTableProps) => {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [novedadModal, setNovedadModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: ''
  });

  const handleCellClick = (employeeId: string, field: 'grossPay' | 'deductions' | 'netPay', currentValue: number) => {
    if (!isEditMode) return;
    
    setEditingCell({
      employeeId,
      field,
      value: currentValue.toString()
    });
  };

  const handleCellSave = async (employeeId: string, field: string, value: string) => {
    const numericValue = parseFloat(value);
    
    if (isNaN(numericValue) || numericValue < 0) {
      toast({
        title: "Valor inválido",
        description: "El valor debe ser un número mayor o igual a 0",
        variant: "destructive"
      });
      setEditingCell(null);
      return;
    }

    const cellKey = `${employeeId}-${field}`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onEmployeeUpdate(employeeId, {
        [field]: numericValue
      });

      toast({
        title: "Guardado",
        description: "El valor se ha actualizado correctamente",
        duration: 2000
      });
    } catch (error) {
      console.error('Error saving cell:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el valor",
        variant: "destructive"
      });
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      setEditingCell(null);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, employeeId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave(employeeId, field, editingCell?.value || '');
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const handleAddNovedad = (employeeId: string, employeeName: string) => {
    setNovedadModal({
      isOpen: true,
      employeeId,
      employeeName
    });
  };

  const handleCloseNovedadModal = () => {
    setNovedadModal({
      isOpen: false,
      employeeId: '',
      employeeName: ''
    });
  };

  const renderEditableCell = (
    employee: PayrollHistoryEmployee, 
    field: 'grossPay' | 'deductions' | 'netPay',
    value: number
  ) => {
    const cellKey = `${employee.id}-${field}`;
    const isEditing = editingCell?.employeeId === employee.id && editingCell?.field === field;
    const isSaving = savingCells.has(cellKey);

    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={editingCell.value}
            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, employee.id, field)}
            onBlur={() => handleCellSave(employee.id, field, editingCell.value)}
            className="w-full h-8 text-sm"
            autoFocus
          />
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleCellSave(employee.id, field, editingCell.value)}
            >
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleCellCancel}
            >
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <span
          className={`font-mono text-sm ${
            isEditMode ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded' : ''
          } ${
            field === 'grossPay' ? 'text-green-700' : 
            field === 'deductions' ? 'text-red-700' : 
            'text-gray-900'
          }`}
          onClick={() => handleCellClick(employee.id, field, value)}
        >
          {formatCurrency(value)}
        </span>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
      </div>
    );
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Devengado</TableHead>
              <TableHead className="text-right">Deducciones</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-center">Estado de Pago</TableHead>
              {isEditMode && <TableHead className="text-center">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell className="text-gray-600">{employee.position}</TableCell>
                <TableCell className="text-right">
                  {renderEditableCell(employee, 'grossPay', employee.grossPay)}
                </TableCell>
                <TableCell className="text-right">
                  {renderEditableCell(employee, 'deductions', employee.deductions)}
                </TableCell>
                <TableCell className="text-right">
                  {renderEditableCell(employee, 'netPay', employee.netPay)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={getPaymentStatusColor(employee.paymentStatus)}>
                    {employee.paymentStatus}
                  </Badge>
                </TableCell>
                {isEditMode && (
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAddNovedad(employee.id, employee.name)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar novedad
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar novedad
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash className="h-4 w-4 mr-2" />
                          Eliminar novedad
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Novedad Modal */}
      <NovedadModal
        isOpen={novedadModal.isOpen}
        onClose={handleCloseNovedadModal}
        employeeId={novedadModal.employeeId}
        employeeName={novedadModal.employeeName}
        periodId={periodId}
      />
    </>
  );
};
