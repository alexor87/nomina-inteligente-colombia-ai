
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Eye, Edit, Trash2, UserCheck, UserX, AlertTriangle, MoreHorizontal,
  Mail, Phone, Calendar, Building2
} from 'lucide-react';
import { EmployeeWithStatus, ESTADOS_EMPLEADO, ComplianceIndicator } from '@/types/employee-extended';
import { CONTRACT_TYPES } from '@/types/employee-config';

interface EmployeeTableProps {
  employees: EmployeeWithStatus[];
  selectedEmployees: string[];
  allCurrentPageSelected: boolean;
  onToggleEmployeeSelection: (id: string) => void;
  onToggleAllEmployees: () => void;
  onOpenEmployeeProfile: (employee: EmployeeWithStatus) => void;
  onEditEmployee: (employee: EmployeeWithStatus) => void;
  onDeleteEmployee: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  getComplianceIndicators: (employee: EmployeeWithStatus) => ComplianceIndicator[];
}

export const EmployeeTable = ({
  employees,
  selectedEmployees,
  allCurrentPageSelected,
  onToggleEmployeeSelection,
  onToggleAllEmployees,
  onOpenEmployeeProfile,
  onEditEmployee,
  onDeleteEmployee,
  onStatusChange,
  getComplianceIndicators
}: EmployeeTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getStatusColor = (status: string) => {
    const estado = ESTADOS_EMPLEADO.find(e => e.value === status);
    return estado?.color || 'bg-gray-100 text-gray-800';
  };

  const getContractTypeLabel = (type: string) => {
    const contractType = CONTRACT_TYPES.find(c => c.value === type);
    return contractType?.label || type;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allCurrentPageSelected && employees.length > 0}
              onCheckedChange={onToggleAllEmployees}
            />
          </TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead>Contrato</TableHead>
          <TableHead>Salario</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Alertas</TableHead>
          <TableHead className="text-center">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => {
          const indicators = getComplianceIndicators(employee);
          return (
            <TableRow key={employee.id} className="hover:bg-gray-50">
              <TableCell>
                <Checkbox
                  checked={selectedEmployees.includes(employee.id)}
                  onCheckedChange={() => onToggleEmployeeSelection(employee.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatar || ''} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {employee.nombre[0]}{employee.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <button 
                      onClick={() => onOpenEmployeeProfile(employee)}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left text-sm"
                    >
                      {employee.nombre} {employee.apellido}
                    </button>
                    <p className="text-sm text-gray-600">{employee.cedula}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-3 w-3 mr-1" />
                    {employee.email || 'No registrado'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-3 w-3 mr-1" />
                    {employee.telefono || 'No registrado'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{employee.cargo}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-3 w-3 mr-1" />
                    {employee.centrosocial || 'Sin asignar'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {getContractTypeLabel(employee.tipoContrato)}
                  </p>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(employee.fechaIngreso)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-semibold text-green-600">
                  {formatCurrency(employee.salarioBase)}
                </p>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(employee.estado)}>
                  {ESTADOS_EMPLEADO.find(e => e.value === employee.estado)?.label || employee.estado}
                </Badge>
              </TableCell>
              <TableCell>
                {indicators.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-600 ml-1">
                          {indicators.length}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {indicators.map((indicator, index) => (
                          <p key={index} className="text-xs">
                            • {indicator.message}
                          </p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenEmployeeProfile(employee)}
                    className="mr-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(employee.id, 'activo')}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Activar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(employee.id, 'inactivo')}>
                        <UserX className="h-4 w-4 mr-2" />
                        Desactivar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDeleteEmployee(employee.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
