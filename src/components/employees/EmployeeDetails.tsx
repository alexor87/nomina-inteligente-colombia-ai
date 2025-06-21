
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { Pencil, FileText, AlertTriangle } from 'lucide-react';

interface EmployeeDetailsProps {
  employee: EmployeeWithStatus;
  onEdit: () => void;
  onClose: () => void;
}

export const EmployeeDetails = ({ employee, onEdit, onClose }: EmployeeDetailsProps) => {
  const getStatusColor = (status: string) => {
    const estado = ESTADOS_EMPLEADO.find(e => e.value === status);
    return estado?.color || 'bg-gray-100 text-gray-800';
  };

  const getContractTypeLabel = (type: string) => {
    const contractType = CONTRACT_TYPES.find(c => c.value === type);
    return contractType?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee.avatar} alt={`${employee.nombre} ${employee.apellido}`} />
            <AvatarFallback className="bg-blue-600 text-white text-xl">
              {employee.nombre[0]}{employee.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {employee.nombre} {employee.apellido}
            </h2>
            <p className="text-gray-600">{employee.cargo}</p>
            <Badge className={getStatusColor(employee.estado)}>
              {employee.estado}
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Cédula</label>
              <p className="text-gray-900">{employee.cedula}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{employee.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Teléfono</label>
              <p className="text-gray-900">{employee.telefono || 'No registrado'}</p>
            </div>
          </div>
        </Card>

        {/* Información Laboral */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Información Laboral</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Salario Base</label>
              <p className="text-gray-900">${employee.salarioBase.toLocaleString('es-CO')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tipo de Contrato</label>
              <p className="text-gray-900">{getContractTypeLabel(employee.tipoContrato)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Fecha de Ingreso</label>
              <p className="text-gray-900">{new Date(employee.fechaIngreso).toLocaleDateString('es-CO')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Centro de Costo</label>
              <p className="text-gray-900">{employee.centrosocial || 'No asignado'}</p>
            </div>
          </div>
        </Card>

        {/* Afiliaciones */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Afiliaciones</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">EPS</label>
              <p className="text-gray-900">{employee.eps || 'Sin asignar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">AFP</label>
              <p className="text-gray-900">{employee.afp || 'Sin asignar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ARL</label>
              <p className="text-gray-900">{employee.arl || 'Sin asignar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Caja de Compensación</label>
              <p className="text-gray-900">{employee.cajaCompensacion || 'Sin asignar'}</p>
            </div>
          </div>
        </Card>

        {/* Estado de Afiliación */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Estado de Cumplimiento</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Estado de Afiliación</label>
              <Badge 
                variant={employee.estadoAfiliacion === 'completa' ? 'default' : 
                        employee.estadoAfiliacion === 'pendiente' ? 'secondary' : 'destructive'}
              >
                {employee.estadoAfiliacion === 'completa' ? 'Completa' :
                 employee.estadoAfiliacion === 'pendiente' ? 'Pendiente' : 'Inconsistente'}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nivel Riesgo ARL</label>
              <p className="text-gray-900">
                {employee.nivelRiesgoARL ? `Nivel ${employee.nivelRiesgoARL}` : 'Sin asignar'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Última Liquidación</label>
              <p className="text-gray-900">
                {employee.ultimaLiquidacion ? 
                  new Date(employee.ultimaLiquidacion).toLocaleDateString('es-CO') : 
                  'Sin procesar'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {employee.estadoAfiliacion !== 'completa' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">
              Este empleado tiene afiliaciones incompletas que requieren atención.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
