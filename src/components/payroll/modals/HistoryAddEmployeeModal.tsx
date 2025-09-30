import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus } from 'lucide-react';

interface HistoryAddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  companyId: string;
  currentEmployeeIds: string[];
  onEmployeesAdded: (employeeIds: string[]) => void;
}

export const HistoryAddEmployeeModal: React.FC<HistoryAddEmployeeModalProps> = ({
  isOpen,
  onClose,
  periodId,
  companyId,
  currentEmployeeIds,
  onEmployeesAdded
}) => {
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableEmployees();
    }
  }, [isOpen, companyId, currentEmployeeIds]);

  const loadAvailableEmployees = async () => {
    try {
      setIsLoading(true);
      
      // Cargar empleados activos que NO están en el período
      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cargo, salario_base, cedula')
        .eq('company_id', companyId)
        .eq('estado', 'activo')
        .not('id', 'in', `(${currentEmployeeIds.join(',') || 'null'})`)
        .order('nombre', { ascending: true });

      if (error) throw error;

      setAvailableEmployees(data || []);
    } catch (error) {
      console.error('Error cargando empleados disponibles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    const filtered = getFilteredEmployees();
    if (selectedEmployeeIds.length === filtered.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filtered.map(e => e.id));
    }
  };

  const getFilteredEmployees = () => {
    if (!searchTerm) return availableEmployees;
    
    const term = searchTerm.toLowerCase();
    return availableEmployees.filter(emp => 
      `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(term) ||
      emp.cedula?.toLowerCase().includes(term) ||
      emp.cargo?.toLowerCase().includes(term)
    );
  };

  const handleAdd = () => {
    if (selectedEmployeeIds.length > 0) {
      onEmployeesAdded(selectedEmployeeIds);
      setSelectedEmployeeIds([]);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    setSelectedEmployeeIds([]);
    setSearchTerm('');
    onClose();
  };

  const filteredEmployees = getFilteredEmployees();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Empleados al Período
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Buscador */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula o cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Seleccionar todos */}
              {filteredEmployees.length > 0 && (
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    checked={selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Seleccionar todos ({filteredEmployees.length})
                  </span>
                </div>
              )}
            </div>

            {/* Lista de empleados */}
            <div className="flex-1 overflow-y-auto border rounded-md">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm 
                    ? 'No se encontraron empleados con ese criterio'
                    : 'No hay empleados disponibles para agregar'
                  }
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                      onClick={() => handleToggleEmployee(employee.id)}
                    >
                      <Checkbox
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onCheckedChange={() => handleToggleEmployee(employee.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {employee.nombre} {employee.apellido}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{employee.cedula}</span>
                          <span>•</span>
                          <span>{employee.cargo}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${employee.salario_base?.toLocaleString('es-CO')}
                        </p>
                        <p className="text-xs text-muted-foreground">Salario base</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={selectedEmployeeIds.length === 0 || isLoading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar ({selectedEmployeeIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
