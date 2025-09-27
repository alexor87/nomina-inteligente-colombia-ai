import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from 'lucide-react';
import { useUnifiedPeriodEdit } from '@/contexts/UnifiedPeriodEditContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface AvailableEmployee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
  salario_base: number;
}

interface AddEmployeeToUnifiedPeriodModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddEmployeeToUnifiedPeriodModal: React.FC<AddEmployeeToUnifiedPeriodModalProps> = ({
  open,
  onClose
}) => {
  const { editState, addEmployee } = useUnifiedPeriodEdit();
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableEmployees();
    }
  }, [open, editState.employees]);

  const loadAvailableEmployees = async () => {
    if (!editState.companyId) return;
    
    setIsLoading(true);
    try {
      const currentEmployeeIds = editState.employees
        .filter(emp => !emp.isRemoved)
        .map(emp => emp.id);

      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cedula, cargo, salario_base')
        .eq('company_id', editState.companyId)
        .eq('estado', 'activo')
        .not('id', 'in', `(${currentEmployeeIds.join(',')})`)
        .order('nombre');

      if (error) throw error;

      setAvailableEmployees(employees || []);
    } catch (error) {
      console.error('Error loading available employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = availableEmployees.filter(emp => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return emp.nombre.toLowerCase().includes(search) || 
           emp.apellido.toLowerCase().includes(search) ||
           emp.cedula.includes(search) ||
           emp.cargo.toLowerCase().includes(search);
  });

  const handleAddEmployee = async (employeeId: string) => {
    setIsAdding(true);
    try {
      await addEmployee(employeeId);
      onClose();
    } catch (error) {
      console.error('Error adding employee:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Empleado al Período</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Badge variant="outline">
              {filteredEmployees.length} disponible{filteredEmployees.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="flex-1 overflow-auto space-y-2">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div>
                  <div className="font-medium">{employee.nombre} {employee.apellido}</div>
                  <div className="text-sm text-muted-foreground">
                    {employee.cedula} • {employee.cargo}
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(employee.salario_base)}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddEmployee(employee.id)}
                  disabled={isAdding}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? 'No se encontraron empleados' : 'No hay empleados disponibles para agregar'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};