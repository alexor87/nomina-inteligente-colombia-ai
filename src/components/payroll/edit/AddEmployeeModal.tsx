import React, { useState, useEffect } from 'react';
import { Plus, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePayrollEdit } from '@/contexts/PayrollEditContext';
import { EmployeeCompositionService, AvailableEmployee } from '@/services/EmployeeCompositionService';
import { useToast } from '@/hooks/use-toast';

interface AddEmployeeModalProps {
  periodId: string;
  companyId: string;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  periodId,
  companyId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<AvailableEmployee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addEmployeeToPeriod, editMode } = usePayrollEdit();
  const { toast } = useToast();

  const loadAvailableEmployees = async () => {
    try {
      setIsLoading(true);
      const employees = await EmployeeCompositionService.getAvailableEmployees(periodId, companyId);
      setAvailableEmployees(employees);
      setFilteredEmployees(employees);
    } catch (error) {
      console.error('❌ Error loading available employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados disponibles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAvailableEmployees();
    }
  }, [isOpen, periodId, companyId]);

  useEffect(() => {
    const filtered = availableEmployees.filter(emp =>
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, availableEmployees]);

  const handleAddEmployee = async (employeeId: string) => {
    try {
      await addEmployeeToPeriod(employeeId);
      // Remove the added employee from the available list
      setAvailableEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      setFilteredEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    } catch (error) {
      console.error('❌ Error adding employee:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!editMode.isActive) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar Empleados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Empleados al Período</DialogTitle>
          <DialogDescription>
            Selecciona los empleados que deseas agregar a este período de nómina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Cargando empleados disponibles...</div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? 'No se encontraron empleados con ese criterio de búsqueda'
                  : 'No hay empleados disponibles para agregar a este período'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {employee.nombre} {employee.apellido}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {employee.cargo || 'Sin cargo'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Salario base: {formatCurrency(employee.salario_base)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddEmployee(employee.id)}
                      disabled={editMode.isLoading}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};