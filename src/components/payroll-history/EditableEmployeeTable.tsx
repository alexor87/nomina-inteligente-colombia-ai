import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Loader2,
  Check,
  X,
  Plus
} from 'lucide-react';
import { PayrollHistoryEmployee } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DevengoModal } from './DevengoModal';

interface EditableEmployeeTableProps {
  employees: PayrollHistoryEmployee[];
  isEditMode: boolean;
  onEmployeeUpdate: (employeeId: string, updates: Partial<PayrollHistoryEmployee>) => void;
  periodId: string; // This is now the real period UUID
  onNovedadChange?: () => void;
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
  periodId, // Real period UUID
  onNovedadChange
}: EditableEmployeeTableProps) => {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [devengoModal, setDevengoModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    employeeSalary: number;
    payrollId: string;
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    employeeSalary: 0,
    payrollId: ''
  });

  console.log('EditableEmployeeTable render - using real period ID:', periodId);

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

  const handleOpenDevengoModal = (employeeId: string, employeeName: string, employeeBaseSalary: number) => {
    console.log('Opening devengado modal for:', employeeId, employeeName, 'Base salary:', employeeBaseSalary);
    
    if (!employeeBaseSalary || employeeBaseSalary <= 0) {
      toast({
        title: "Error",
        description: "No se encontró el salario base del empleado o es inválido",
        variant: "destructive"
      });
      return;
    }

    // Find the employee to get their real payrollId
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !employee.payrollId) {
      toast({
        title: "Error",
        description: "No se encontró el ID de nómina del empleado",
        variant: "destructive"
      });
      return;
    }

    // Validate that payrollId is a proper UUID
    const isValidUUID = (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    if (!isValidUUID(employee.payrollId)) {
      toast({
        title: "Error",
        description: `ID de nómina inválido para el empleado ${employeeName}`,
        variant: "destructive"
      });
      return;
    }

    // Validate that periodId is also a proper UUID
    if (!isValidUUID(periodId)) {
      toast({
        title: "Error",
        description: "ID de período inválido",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Using real period UUID for novedades:', periodId);
    console.log('✅ Using real payroll UUID:', employee.payrollId, 'for employee:', employeeName);
    
    setDevengoModal({
      isOpen: true,
      employeeId,
      employeeName,
      employeeSalary: employeeBaseSalary,
      payrollId: employee.payrollId // Real payroll UUID
    });
  };

  const handleCloseDevengoModal = useCallback(() => {
    console.log('Closing devengado modal');
    setDevengoModal({
      isOpen: false,
      employeeId: '',
      employeeName: '',
      employeeSalary: 0,
      payrollId: ''
    });
  }, []);

  const handleNovedadCreated = useCallback((employeeId: string, valor: number, tipo: 'devengado' | 'deduccion') => {
    console.log('Novedad created:', { employeeId, valor, tipo });
    
    // Actualizar valores automáticamente
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    let updates: Partial<PayrollHistoryEmployee> = {};
    
    if (tipo === 'devengado') {
      updates.grossPay = employee.grossPay + valor;
    } else if (tipo === 'deduccion') {
      updates.deductions = employee.deductions + valor;
    }
    
    // Recalcular neto
    const newGrossPay = updates.grossPay || employee.grossPay;
    const newDeductions = updates.deductions || employee.deductions;
    updates.netPay = newGrossPay - newDeductions;

    onEmployeeUpdate(employeeId, updates);
    
    // Notificar cambio para recálculo de totales
    if (onNovedadChange) {
      onNovedadChange();
    }

    toast({
      title: "Novedad aplicada",
      description: `Se ha ${tipo === 'devengado' ? 'sumado' : 'descontado'} ${formatCurrency(valor)} automáticamente`,
      duration: 3000
    });
  }, [employees, onEmployeeUpdate, onNovedadChange, toast]);

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
      <div className="flex items-center justify-between">
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
        
        {/* Botón + solo para devengados y en modo edición */}
        {field === 'grossPay' && isEditMode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 ml-2"
            onClick={() => handleOpenDevengoModal(
              employee.id, 
              employee.name, 
              employee.baseSalary
            )}
            title="Agregar devengado"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
        
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-blue-600 ml-2" />}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Devengado Modal */}
      <DevengoModal
        isOpen={devengoModal.isOpen}
        onClose={handleCloseDevengoModal}
        employeeId={devengoModal.employeeId}
        employeeName={devengoModal.employeeName}
        employeeSalary={devengoModal.employeeSalary}
        payrollId={devengoModal.payrollId} // Real payroll UUID
        periodId={periodId} // Real period UUID for novedades
        onNovedadCreated={handleNovedadCreated}
      />
    </>
  );
};
