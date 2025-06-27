import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MoreHorizontal, 
  User, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  Edit
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { EmployeeWithStatus } from '@/types/employee-extended';

interface EmployeeTableReadOnlyProps {
  employees: EmployeeWithStatus[];
  selectedEmployees: string[];
  allCurrentPageSelected: boolean;
  onToggleEmployeeSelection: (employeeId: string) => void;
  onToggleAllEmployees: () => void;
  onEditEmployee: (employee: EmployeeWithStatus) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onStatusChange: (employeeId: string, status: string) => void;
  getComplianceIndicators: (employee: EmployeeWithStatus) => any;
}

export const EmployeeTableReadOnly = ({
  employees,
  selectedEmployees,
  allCurrentPageSelected,
  onToggleEmployeeSelection,
  onToggleAllEmployees,
  onEditEmployee,
  onDeleteEmployee,
  onStatusChange,
  getComplianceIndicators
}: EmployeeTableReadOnlyProps) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'activo': { label: 'Activo', variant: 'default' as const, icon: CheckCircle },
      'inactivo': { label: 'Inactivo', variant: 'secondary' as const, icon: XCircle },
      'vacaciones': { label: 'Vacaciones', variant: 'outline' as const, icon: Clock },
      'incapacidad': { label: 'Incapacidad', variant: 'destructive' as const, icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.activo;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getComplianceIcon = (indicators: any) => {
    if (!indicators) return null;

    const { hasIncompleteData, hasCriticalIssues, isFullyCompliant } = indicators;

    if (hasCriticalIssues) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <XCircle className="h-4 w-4 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Empleado con problemas críticos</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (hasIncompleteData) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Empleado con información incompleta</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (isFullyCompliant) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Empleado completamente configurado</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return null;
  };

  const handleStatusChange = (employeeId: string, newStatus: string) => {
    onStatusChange(employeeId, newStatus);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allCurrentPageSelected}
                onCheckedChange={onToggleAllEmployees}
                aria-label="Seleccionar todos los empleados"
              />
            </TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead>Empleado</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Salario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha Ingreso</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const isSelected = selectedEmployees.includes(employee.id);
            const indicators = getComplianceIndicators(employee);
            const isHovered = hoveredRow === employee.id;

            return (
              <TableRow
                key={employee.id}
                className={`transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                onMouseEnter={() => setHoveredRow(employee.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleEmployeeSelection(employee.id)}
                    aria-label={`Seleccionar ${employee.nombre} ${employee.apellido}`}
                  />
                </TableCell>
                <TableCell>
                  {getComplianceIcon(indicators)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {employee.avatar ? (
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={employee.avatar}
                          alt={`${employee.nombre} ${employee.apellido}`}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {employee.nombre} {employee.apellido}
                      </p>
                      {employee.email && (
                        <p className="text-sm text-gray-500 truncate">
                          {employee.email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-gray-900">{employee.cedula}</p>
                    <p className="text-gray-500 text-xs">{employee.tipoDocumento}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900">
                    {employee.cargo || 'No especificado'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(employee.salarioBase)}
                  </span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(employee.estado)}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900">
                    {employee.fechaIngreso ? new Date(employee.fechaIngreso).toLocaleDateString() : 'No especificada'}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className={`h-8 w-8 p-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                      >
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar empleado
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(employee.id, 'activo')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar como activo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(employee.id, 'inactivo')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Marcar como inactivo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(employee.id, 'vacaciones')}>
                        <Clock className="mr-2 h-4 w-4" />
                        Marcar en vacaciones
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDeleteEmployee(employee.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar empleado
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
