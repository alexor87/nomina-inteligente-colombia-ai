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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Eye, UserX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, CircleX } from 'lucide-react';

interface EmployeeTableProps {
  employees: EmployeeWithStatus[];
  onEdit: (employee: EmployeeWithStatus) => void;
  onView: (employee: EmployeeWithStatus) => void;
  onChangeStatus: (employee: EmployeeWithStatus, newStatus: string) => void;
  onDelete: (employee: EmployeeWithStatus) => void;
}

export const EmployeeTable = ({ 
  employees, 
  onEdit, 
  onView, 
  onChangeStatus, 
  onDelete 
}: EmployeeTableProps) => {
  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'inactivo': return 'bg-red-100 text-red-800';
      case 'vacaciones': return 'bg-blue-100 text-blue-800';
      case 'incapacidad': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (estado: string) => {
    switch (estado) {
      case 'activo': return 'Activo';
      case 'inactivo': return 'Inactivo';
      case 'vacaciones': return 'En Vacaciones';
      case 'incapacidad': return 'Incapacidad';
      default: return 'Desconocido';
    }
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
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
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
              <TableCell>
                <Badge className={getStatusColor(employee.estado)}>
                  {getStatusLabel(employee.estado)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onView(employee)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(employee)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onChangeStatus(employee, employee.estado === 'activo' ? 'inactivo' : 'activo')}>
                      <UserX className="mr-2 h-4 w-4" />
                      {employee.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(employee)}>
                      <UserX className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
