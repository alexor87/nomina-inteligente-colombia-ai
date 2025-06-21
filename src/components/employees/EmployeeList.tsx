
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmployeeFiltersComponent } from './EmployeeFilters';
import { useEmployeeList } from '@/hooks/useEmployeeList';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { 
  Eye, 
  Pencil, 
  FileText, 
  MoreHorizontal, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Download,
  Upload,
  UserPlus
} from 'lucide-react';

export const EmployeeList = () => {
  const {
    employees,
    filters,
    selectedEmployees,
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    bulkUpdateStatus,
    exportEmployees,
    getComplianceIndicators,
    totalEmployees,
    filteredCount
  } = useEmployeeList();

  const [showBulkActions, setShowBulkActions] = useState(false);

  const getStatusColor = (status: string) => {
    const estado = ESTADOS_EMPLEADO.find(e => e.value === status);
    return estado?.color || 'bg-gray-100 text-gray-800';
  };

  const getContractTypeLabel = (type: string) => {
    const contractType = CONTRACT_TYPES.find(c => c.value === type);
    return contractType?.label || type;
  };

  const getComplianceIcon = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return null;

    const indicators = getComplianceIndicators(employee);
    
    if (indicators.length === 0) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Todo en orden</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    const hasVencido = indicators.some(i => i.status === 'vencido');
    const hasPendiente = indicators.some(i => i.status === 'pendiente');

    return (
      <Tooltip>
        <TooltipTrigger>
          {hasVencido ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : hasPendiente ? (
            <Clock className="h-4 w-4 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {indicators.map((indicator, index) => (
              <p key={index} className="text-sm">{indicator.message}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600 mt-1">
            Gestiona la información de todos los empleados de tu empresa
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => exportEmployees('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <EmployeeFiltersComponent
        filters={filters}
        onUpdateFilters={updateFilters}
        onClearFilters={clearFilters}
        totalCount={totalEmployees}
        filteredCount={filteredCount}
      />

      {/* Acciones masivas */}
      {selectedEmployees.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-blue-900">
                {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? 's' : ''} seleccionado{selectedEmployees.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => bulkUpdateStatus('activo')}
                >
                  Activar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => bulkUpdateStatus('inactivo')}
                >
                  Inactivar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => exportEmployees('excel')}
                >
                  Exportar seleccionados
                </Button>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => toggleAllEmployees()}
            >
              Deseleccionar todo
            </Button>
          </div>
        </Card>
      )}

      {/* Tabla de empleados */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onCheckedChange={toggleAllEmployees}
                  />
                </TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Centro de Costo</TableHead>
                <TableHead>Afiliación</TableHead>
                <TableHead>Riesgo ARL</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Liquidación</TableHead>
                <TableHead>Cumplimiento</TableHead>
                <TableHead className="w-16">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatar} alt={`${employee.nombre} ${employee.apellido}`} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {employee.nombre[0]}{employee.apellido[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-500">
                          CC: {employee.cedula}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">{employee.cargo}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">
                      ${employee.salarioBase.toLocaleString('es-CO')}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {getContractTypeLabel(employee.tipoContrato)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Desde: {new Date(employee.fechaIngreso).toLocaleDateString('es-CO')}
                      {employee.contratoVencimiento && (
                        <div className="text-xs text-orange-600">
                          Vence: {new Date(employee.contratoVencimiento).toLocaleDateString('es-CO')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-900">{employee.centrosocial || '-'}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-xs">
                        <span className="font-medium">EPS:</span> {employee.eps || 'Pendiente'}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">AFP:</span> {employee.afp || 'Pendiente'}
                      </div>
                      <Badge 
                        variant={employee.estadoAfiliacion === 'completa' ? 'default' : 
                                employee.estadoAfiliacion === 'pendiente' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {employee.estadoAfiliacion === 'completa' ? 'Completa' :
                         employee.estadoAfiliacion === 'pendiente' ? 'Pendiente' : 'Inconsistente'}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {employee.nivelRiesgoARL ? (
                      <Badge variant="outline">
                        Nivel {employee.nivelRiesgoARL}
                      </Badge>
                    ) : (
                      <span className="text-red-500 text-sm">Sin asignar</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getStatusColor(employee.estado)}>
                      {employee.estado}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {employee.ultimaLiquidacion ? 
                        new Date(employee.ultimaLiquidacion).toLocaleDateString('es-CO') : 
                        'Sin procesar'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getComplianceIcon(employee.id)}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver ficha
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          Historial nómina
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          Historial cambios
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={employee.estado === 'activo' ? 'text-red-600' : 'text-green-600'}
                        >
                          {employee.estado === 'activo' ? 'Inactivar' : 'Reactivar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {employees.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              No se encontraron empleados que coincidan con los filtros aplicados.
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
