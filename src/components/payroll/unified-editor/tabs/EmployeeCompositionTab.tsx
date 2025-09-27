import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, UserPlus, UserMinus } from 'lucide-react';
import { useUnifiedPeriodEdit, PeriodEmployee } from '@/contexts/UnifiedPeriodEditContext';
import { formatCurrency } from '@/lib/utils';
import { AddEmployeeToUnifiedPeriodModal } from '../modals/AddEmployeeToUnifiedPeriodModal';

export const EmployeeCompositionTab: React.FC = () => {
  const { editState, removeEmployee } = useUnifiedPeriodEdit();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter employees based on search and status
  const filteredEmployees = editState.employees
    .filter(emp => !emp.isRemoved)
    .filter(emp => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return emp.nombre.toLowerCase().includes(search) || 
             emp.apellido.toLowerCase().includes(search) ||
             emp.cedula.includes(search) ||
             emp.cargo.toLowerCase().includes(search);
    });

  const getEmployeeStatus = (employee: PeriodEmployee) => {
    if (employee.isNew) return 'new';
    if (employee.isRemoved) return 'removed';
    return 'existing';
  };

  const getStatusBadge = (employee: PeriodEmployee) => {
    const status = getEmployeeStatus(employee);
    switch (status) {
      case 'new':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Nuevo</Badge>;
      case 'removed':
        return <Badge variant="secondary" className="bg-red-100 text-red-700">Removido</Badge>;
      default:
        return null;
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    const employee = editState.employees.find(emp => emp.id === employeeId);
    const confirmMessage = employee?.isNew 
      ? '¿Estás seguro de que quieres quitar este empleado del período?'
      : '¿Estás seguro de que quieres remover este empleado del período? Se mantendrá un registro en la auditoría.';
    
    if (window.confirm(confirmMessage)) {
      removeEmployee(employeeId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Composición de Empleados</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona qué empleados están incluidos en este período de nómina
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Empleado
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, cédula o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Badge variant="outline" className="ml-2">
          {filteredEmployees.length} empleado{filteredEmployees.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-sm text-green-600 font-medium">Empleados Agregados</div>
              <div className="text-2xl font-bold text-green-700">
                {editState.employees.filter(emp => emp.isNew && !emp.isRemoved).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-sm text-red-600 font-medium">Empleados Removidos</div>
              <div className="text-2xl font-bold text-red-700">
                {editState.employees.filter(emp => emp.isRemoved).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div>
              <div className="text-sm text-blue-600 font-medium">Total Activos</div>
              <div className="text-2xl font-bold text-blue-700">
                {editState.employees.filter(emp => !emp.isRemoved).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Salario Base</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Total Devengado</TableHead>
              <TableHead>Neto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow 
                key={employee.id}
                className={employee.isNew ? 'bg-green-50' : undefined}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{employee.nombre} {employee.apellido}</div>
                    <div className="text-sm text-muted-foreground">{employee.cedula}</div>
                  </div>
                </TableCell>
                <TableCell>{employee.cargo}</TableCell>
                <TableCell>{formatCurrency(employee.salario_base)}</TableCell>
                <TableCell>{employee.dias_trabajados}</TableCell>
                <TableCell>{formatCurrency(employee.total_devengado)}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(employee.neto_pagado)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(employee)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmployee(employee.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredEmployees.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'No se encontraron empleados que coincidan con la búsqueda' : 'No hay empleados en este período'}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeToUnifiedPeriodModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};