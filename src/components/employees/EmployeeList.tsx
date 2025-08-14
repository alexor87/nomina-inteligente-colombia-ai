import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Filter, Download, Mail, MoreVertical, Edit, Trash2, Undo2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEmployeeList } from '@/hooks/useEmployeeList';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeService } from '@/services/EmployeeService';
import { EmployeeBulkActions } from './EmployeeBulkActions';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface EmployeeListProps {
  onEmployeeSelect?: (employee: EmployeeUnified) => void;
  selectionMode?: boolean;
}

export const EmployeeList = ({ onEmployeeSelect, selectionMode = false }: EmployeeListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    employees,
    isLoading,
    error,
    filters,
    setFilters,
    selectedEmployees,
    pagination,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    totalEmployees,
    filteredCount,
    refreshEmployees,
    forceCompleteRefresh,
    getComplianceIndicators,
    clearSelection,
    statistics
  } = useEmployeeList();

  const [showFilters, setShowFilters] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedEmployees, setDeletedEmployees] = useState<EmployeeUnified[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      'activo': 'bg-green-100 text-green-800',
      'inactivo': 'bg-red-100 text-red-800',
      'vacaciones': 'bg-blue-100 text-blue-800',
      'incapacidad': 'bg-yellow-100 text-yellow-800',
      'eliminado': 'bg-gray-100 text-gray-800' // ✅ ADDED eliminado status
    };
    
    const labels = {
      'activo': 'Activo',
      'inactivo': 'Inactivo',
      'vacaciones': 'Vacaciones',
      'incapacidad': 'Incapacidad',
      'eliminado': 'Eliminado' // ✅ ADDED eliminado label
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleEmployeeClick = (employee: EmployeeUnified) => {
    if (selectionMode && onEmployeeSelect) {
      onEmployeeSelect(employee);
    } else {
      navigate(`/app/employees/${employee.id}/edit`);
    }
  };

  const handleSoftDelete = async (employeeId: string, employeeName: string) => {
    try {
      const result = await EmployeeService.deleteEmployee(employeeId);
      if (result.success) {
        toast({
          title: "Empleado eliminado",
          description: `${employeeName} ha sido eliminado correctamente.`,
        });
        await refreshEmployees();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el empleado",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al eliminar empleado",
        variant: "destructive"
      });
    }
  };

  const handleRestoreEmployee = async (employeeId: string, employeeName: string) => {
    try {
      const result = await EmployeeService.restoreEmployee(employeeId);
      if (result.success) {
        toast({
          title: "Empleado restaurado",
          description: `${employeeName} ha sido restaurado correctamente.`,
        });
        await loadDeletedEmployees();
        await refreshEmployees();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo restaurar el empleado",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al restaurar empleado",
        variant: "destructive"
      });
    }
  };

  const loadDeletedEmployees = async () => {
    try {
      const result = await EmployeeService.getDeletedEmployees();
      if (result.success && result.data) {
        setDeletedEmployees(result.data);
      }
    } catch (error) {
      console.error('Error loading deleted employees:', error);
    }
  };

  const toggleDeletedView = async () => {
    if (!showDeleted) {
      await loadDeletedEmployees();
    }
    setShowDeleted(!showDeleted);
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) return;

    try {
      setIsUpdating(true);
      const result = await EmployeeService.bulkDeleteEmployees(selectedEmployees);
      
      if (result.success) {
        const { results } = result;
        if (results.successful > 0) {
          toast({
            title: "Empleados eliminados",
            description: `${results.successful} empleado${results.successful !== 1 ? 's' : ''} eliminado${results.successful !== 1 ? 's' : ''} correctamente.`,
          });
        }
        
        if (results.failed > 0) {
          toast({
            title: "Algunos empleados no pudieron ser eliminados",
            description: `${results.failed} empleado${results.failed !== 1 ? 's' : ''} no pudo${results.failed !== 1 ? 'ieron' : ''} ser eliminado${results.failed !== 1 ? 's' : ''}.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron eliminar los empleados",
          variant: "destructive"
        });
      }
      
      await refreshEmployees();
      clearSelection();
      setShowBulkDeleteDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al eliminar empleados",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: 'activo' | 'inactivo') => {
    if (selectedEmployees.length === 0) return;

    try {
      setIsUpdating(true);
      const result = await EmployeeService.bulkUpdateStatus(selectedEmployees, newStatus);
      
      if (result.success) {
        const { results } = result;
        const statusLabel = newStatus === 'activo' ? 'activado' : 'desactivado';
        
        if (results.successful > 0) {
          toast({
            title: "Estado actualizado",
            description: `${results.successful} empleado${results.successful !== 1 ? 's' : ''} ${statusLabel}${results.successful !== 1 ? 's' : ''} correctamente.`,
          });
        }
        
        if (results.failed > 0) {
          toast({
            title: "Algunos empleados no pudieron ser actualizados",
            description: `${results.failed} empleado${results.failed !== 1 ? 's' : ''} no pudo${results.failed !== 1 ? 'ieron' : ''} ser actualizado${results.failed !== 1 ? 's' : ''}.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el estado de los empleados",
          variant: "destructive"
        });
      }
      
      await refreshEmployees();
      clearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al actualizar empleados",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error: {error}
            <Button onClick={refreshEmployees} className="ml-4">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentEmployees = showDeleted ? deletedEmployees : employees;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {showDeleted ? 'Empleados Eliminados' : 'Empleados'}
          </h2>
          <p className="text-gray-600">
            {showDeleted 
              ? `${deletedEmployees.length} empleados eliminados`
              : `${totalEmployees} empleados • ${filteredCount} mostrados`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showDeleted ? "default" : "outline"} 
            onClick={toggleDeletedView}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {showDeleted ? 'Ver Activos' : 'Ver Eliminados'}
          </Button>
          {!showDeleted && (
            <>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <Button onClick={() => navigate('/app/employees/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Empleado
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && !showDeleted && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar empleados..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={filters.estado}
                onValueChange={(value) => setFilters({ estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="incapacidad">Incapacidad</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.tipoContrato}
                onValueChange={(value) => setFilters({ tipoContrato: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="fijo">Fijo</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="aprendizaje">Aprendizaje</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics (only for active employees) */}
      {!showDeleted && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
              <div className="text-sm text-gray-600">Activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{statistics.inactive}</div>
              <div className="text-sm text-gray-600">Inactivos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{statistics.onVacation}</div>
              <div className="text-sm text-gray-600">En Vacaciones</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{statistics.onLeave}</div>
              <div className="text-sm text-gray-600">Incapacidad</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Actions */}
      {!showDeleted && (
        <EmployeeBulkActions
          selectedCount={selectedEmployees.length}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          onBulkDelete={() => setShowBulkDeleteDialog(true)}
          isUpdating={isUpdating}
        />
      )}

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {showDeleted ? 'Lista de Empleados Eliminados' : 'Lista de Empleados'}
            {!showDeleted && selectedEmployees.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedEmployees.length} seleccionados
                </span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {!showDeleted && (
                    <th className="text-left p-4">
                      <Checkbox
                        checked={currentEmployees.length > 0 && currentEmployees.every(emp => selectedEmployees.includes(emp.id))}
                        onCheckedChange={toggleAllEmployees}
                      />
                    </th>
                  )}
                  <th className="text-left p-4">Empleado</th>
                  <th className="text-left p-4">Cédula</th>
                  <th className="text-left p-4">Cargo</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Salario</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => !showDeleted && handleEmployeeClick(employee)}
                  >
                    {!showDeleted && (
                      <td className="p-4">
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <div>
                        <div className="font-medium">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </div>
                    </td>
                    <td className="p-4">{employee.cedula}</td>
                    <td className="p-4">{employee.cargo || 'No especificado'}</td>
                    <td className="p-4">{getStatusBadge(employee.estado)}</td>
                    <td className="p-4">
                      ${employee.salarioBase?.toLocaleString() || '0'}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {showDeleted ? (
                            <DropdownMenuItem 
                              onClick={() => handleRestoreEmployee(employee.id, `${employee.nombre} ${employee.apellido}`)}
                              className="text-green-600"
                            >
                              <Undo2 className="w-4 h-4 mr-2" />
                              Restaurar
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/app/employees/${employee.id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleSoftDelete(employee.id, `${employee.nombre} ${employee.apellido}`)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {currentEmployees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {showDeleted ? 'No hay empleados eliminados' : 'No se encontraron empleados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleados seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará (borrado lógico) {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? 's' : ''} seleccionado{selectedEmployees.length !== 1 ? 's' : ''}. 
              Los empleados serán marcados como eliminados y podrán ser restaurados posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isUpdating}>
              {isUpdating ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
