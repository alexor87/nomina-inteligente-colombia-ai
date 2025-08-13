
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { formatCurrency } from '@/utils/formatters';

interface EmployeeDetailsProps {
  employee: EmployeeWithStatus;
}

export const EmployeeDetails = ({ employee }: EmployeeDetailsProps) => {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(employee.nombre, employee.apellido)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">
                {employee.nombre} {employee.apellido}
              </CardTitle>
              <p className="text-gray-600">{employee.cargo}</p>
              <Badge className={getStatusColor(employee.estado)}>
                {employee.estado}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
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
          </CardContent>
        </Card>

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
              <span className="font-medium">Centro de Costos:</span>
              <span>{employee.centroCostos || 'No asignado'}</span>
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
};
