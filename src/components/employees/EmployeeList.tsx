
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Filter, Download, Mail, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useEmployeeList } from '@/hooks/useEmployeeList';
import { EmployeeBulkDeleteActions } from './EmployeeBulkDeleteActions';
import { EmployeeUnified } from '@/types/employee-unified';
import { useNavigate } from 'react-router-dom';

interface EmployeeListProps {
  onEmployeeSelect?: (employee: EmployeeUnified) => void;
  selectionMode?: boolean;
}

export const EmployeeList = ({ onEmployeeSelect, selectionMode = false }: EmployeeListProps) => {
  const navigate = useNavigate();
  const {
    employees,
    isLoading,
    isDeleting,
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
    deleteEmployee,
    deleteMultipleEmployees,
    statistics
  } = useEmployeeList();

  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const variants = {
      'activo': 'bg-green-100 text-green-800',
      'inactivo': 'bg-red-100 text-red-800',
      'vacaciones': 'bg-blue-100 text-blue-800',
      'incapacidad': 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      'activo': 'Activo',
      'inactivo': 'Inactivo',
      'vacaciones': 'Vacaciones',
      'incapacidad': 'Incapacidad'
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

  const handleEditEmployee = (e: React.MouseEvent, employeeId: string) => {
    e.stopPropagation();
    navigate(`/app/employees/${employeeId}/edit`);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    await deleteEmployee(employeeId);
    setDeleteConfirmId(null);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Empleados</h2>
          <p className="text-gray-600">
            {totalEmployees} empleados • {filteredCount} mostrados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => navigate('/app/employees/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Bulk Delete Actions */}
      <EmployeeBulkDeleteActions
        selectedCount={selectedEmployees.length}
        selectedEmployeeIds={selectedEmployees}
        onBulkDelete={deleteMultipleEmployees}
        onClearSelection={clearSelection}
        isDeleting={isDeleting}
      />

      {/* Filters */}
      {showFilters && (
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

      {/* Statistics */}
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

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lista de Empleados
            {selectedEmployees.length > 0 && (
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
                  <th className="text-left p-4">
                    <Checkbox
                      checked={employees.length > 0 && employees.every(emp => selectedEmployees.includes(emp.id))}
                      onCheckedChange={toggleAllEmployees}
                    />
                  </th>
                  <th className="text-left p-4">Empleado</th>
                  <th className="text-left p-4">Cédula</th>
                  <th className="text-left p-4">Cargo</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Salario</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      <div>
                        <div className="font-medium">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </div>
                    </td>
                    <td 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      {employee.cedula}
                    </td>
                    <td 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      {employee.cargo || 'No especificado'}
                    </td>
                    <td 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      {getStatusBadge(employee.estado)}
                    </td>
                    <td 
                      className="p-4 cursor-pointer"
                      onClick={() => handleEmployeeClick(employee)}
                    >
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
                          <DropdownMenuItem onClick={(e) => handleEditEmployee(e, employee.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Enviar Comprobante
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar a {employee.nombre} {employee.apellido}? 
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "Eliminando..." : "Eliminar"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {employees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron empleados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
