import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmployeeWithStatus } from '@/types/employee-extended';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EmployeeTableReadOnlyProps {
  employees: EmployeeWithStatus[];
  onView: (employee: EmployeeWithStatus) => void;
}

export const EmployeeTableReadOnly = ({ employees, onView }: EmployeeTableReadOnlyProps) => {
  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Centro de Costos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha Ingreso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow 
              key={employee.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onView(employee)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(employee.nombre, employee.apellido)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{employee.nombre} {employee.apellido}</div>
                    <div className="text-sm text-gray-500">{employee.cedula}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{employee.cargo || 'No asignado'}</TableCell>
              <TableCell>{employee.centroCostos || 'No asignado'}</TableCell>
              <TableCell>{employee.estado}</TableCell>
              <TableCell>{formatDate(employee.fechaIngreso)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
