import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from '@/utils/formatters';
import { EmployeeWithStatus } from '@/types/employee-extended';

interface EmployeeProfileProps {
  employee: EmployeeWithStatus;
  onClose: () => void;
}

export const EmployeeProfile = ({ employee, onClose }: EmployeeProfileProps) => {
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

  return (
    <div className="flex flex-col h-full max-h-[95vh]">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-6 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-lg font-semibold bg-blue-500 text-white">
              {getInitials(employee.nombre, employee.apellido)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <CardTitle className="text-xl font-semibold">{employee.nombre} {employee.apellido}</CardTitle>
            <p className="text-sm text-gray-500">{employee.cargo || 'No asignado'}</p>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Cédula:</span>
                <span>{employee.cedula}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span>{employee.email || 'No registrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Teléfono:</span>
                <span>{employee.telefono || 'No registrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Fecha Nacimiento:</span>
                <span>{employee.fechaNacimiento || 'No registrada'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Dirección:</span>
                <span>{employee.direccion || 'No registrada'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Labor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Laboral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Salario Base:</span>
                <span>{formatCurrency(employee.salarioBase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tipo Contrato:</span>
                <span>{employee.tipoContrato}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Fecha Ingreso:</span>
                <span>{employee.fechaIngreso}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Estado:</span>
                <span className={getStatusColor(employee.estado)}>{employee.estado}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Centro de Costos:</span>
                <span>{employee.centroCostos || 'No asignado'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Affiliation Information */}
          <Card>
            <CardHeader>
              <CardTitle>Afiliaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">EPS:</span>
                <span>{employee.eps || 'No afiliado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">AFP:</span>
                <span>{employee.afp || 'No afiliado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">ARL:</span>
                <span>{employee.arl || 'No afiliado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Caja Compensación:</span>
                <span>{employee.cajaCompensacion || 'No afiliado'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Banking Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Bancaria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Banco:</span>
                <span>{employee.banco || 'No registrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tipo Cuenta:</span>
                <span>{employee.tipoCuenta || 'No registrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Número Cuenta:</span>
                <span>{employee.numeroCuenta || 'No registrado'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
