
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AvailableEmployee {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
  salario_base: number;
}

interface EmployeeAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployees: (employeeIds: string[]) => Promise<void>;
  currentEmployeeIds: string[];
  companyId: string;
}

export const EmployeeAddModal: React.FC<EmployeeAddModalProps> = ({
  isOpen,
  onClose,
  onAddEmployees,
  currentEmployeeIds,
  companyId
}) => {
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Load available employees when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableEmployees();
    }
  }, [isOpen, currentEmployeeIds]);

  const loadAvailableEmployees = async () => {
    setIsLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cedula, cargo, salario_base')
        .eq('company_id', companyId)
        .eq('estado', 'activo')
        .not('id', 'in', `(${currentEmployeeIds.join(',')})`);

      if (error) {
        throw error;
      }

      setAvailableEmployees(employees || []);
    } catch (error) {
      console.error('Error loading available employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados disponibles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = availableEmployees.filter(employee =>
    `${employee.nombre} ${employee.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.cedula.includes(searchTerm) ||
    employee.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map(emp => emp.id));
    }
  };

  const handleAddEmployees = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast({
        title: "Advertencia",
        description: "Selecciona al menos un empleado para agregar",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      await onAddEmployees(selectedEmployeeIds);
      
      toast({
        title: "✅ Empleados agregados",
        description: `Se agregaron ${selectedEmployeeIds.length} empleado(s) a la liquidación`,
        className: "border-green-200 bg-green-50"
      });
      
      // Reset and close
      setSelectedEmployeeIds([]);
      setSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error adding employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployeeIds([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Agregar Empleados a la Liquidación</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar empleados</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por nombre, cédula o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Select All */}
          {filteredEmployees.length > 0 && (
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={selectedEmployeeIds.length === filteredEmployees.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Seleccionar todos ({filteredEmployees.length})
              </Label>
            </div>
          )}

          {/* Employee List */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Cargando empleados disponibles...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {availableEmployees.length === 0 
                  ? "No hay empleados disponibles para agregar"
                  : "No se encontraron empleados con el término de búsqueda"
                }
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                      selectedEmployeeIds.includes(employee.id) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <Checkbox
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onCheckedChange={() => handleEmployeeToggle(employee.id)}
                    />
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-500">CC: {employee.cedula}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">{employee.cargo || 'Sin cargo'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(employee.salario_base)}
                        </div>
                        <div className="text-sm text-gray-500">Salario base</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddEmployees} 
            disabled={selectedEmployeeIds.length === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Agregando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar {selectedEmployeeIds.length > 0 ? `(${selectedEmployeeIds.length})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
