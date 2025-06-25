import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Users, Filter, Download, MoreHorizontal, 
  Eye, Edit, Trash2, UserCheck, UserX, AlertTriangle,
  Mail, Phone, Calendar, Building2, Briefcase, Upload, Loader2, TestTube, Shield
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmployeeFiltersComponent } from './EmployeeFilters';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import { useEmployeeList } from '@/hooks/useEmployeeList';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { EmployeeWithStatus, ESTADOS_EMPLEADO, ComplianceIndicator } from '@/types/employee-extended';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { ImportEmployeesDrawer } from './ImportEmployeesDrawer';
import { EmployeeExcelExportService } from '@/services/EmployeeExcelExportService';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCreationTest } from '../test/EmployeeCreationTest';

export const EmployeeList = () => {
  const {
    employees,
    filters,
    selectedEmployees,
    isLoading,
    selectedEmployee,
    isEmployeeProfileOpen,
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    bulkUpdateStatus,
    openEmployeeProfile,
    closeEmployeeProfile,
    totalEmployees,
    filteredCount,
    refreshEmployees
  } = useEmployeeList();

  const { changeEmployeeStatus, deleteEmployee } = useEmployeeCRUD();
  const { toast } = useToast();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showTest, setShowTest] = useState(false);

  // Verificar si estamos en modo soporte
  const urlParams = new URLSearchParams(window.location.search);
  const supportCompanyId = urlParams.get('support_company');
  const isSupportMode = !!supportCompanyId;

  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleEditEmployee = (employee: EmployeeWithStatus) => {
    setEditingEmployee(employee);
    setIsFormModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      const result = await deleteEmployee(employeeId);
      if (result.success) {
        refreshEmployees();
      }
    }
  };

  const handleStatusChange = async (employeeId: string, newStatus: string) => {
    const result = await changeEmployeeStatus(employeeId, newStatus);
    if (result.success) {
      refreshEmployees();
    }
  };

  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      
      // Show loading toast
      toast({
        title: "Preparando archivo...",
        description: EmployeeExcelExportService.getExportSummary(totalEmployees, filteredCount),
      });

      const result = await EmployeeExcelExportService.exportToExcel(employees, 'empleados');
      
      toast({
        title: "Archivo exportado exitosamente",
        description: `Se exportaron ${result.recordCount} empleados a ${result.fileName}`,
      });
    } catch (error) {
      console.error('Error exporting employees:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo Excel. Por favor intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const goBackToSupport = () => {
    window.location.href = '/support-backoffice';
  };

  const getComplianceIndicators = (employee: EmployeeWithStatus): ComplianceIndicator[] => {
    const indicators: ComplianceIndicator[] = [];

    if (!employee.eps) {
      indicators.push({
        type: 'eps',
        status: 'pendiente',
        message: 'Falta afiliación a EPS'
      });
    }

    if (!employee.afp) {
      indicators.push({
        type: 'pension',
        status: 'pendiente',
        message: 'Falta afiliación a fondo de pensiones'
      });
    }

    if (!employee.nivelRiesgoARL) {
      indicators.push({
        type: 'arl',
        status: 'pendiente',
        message: 'Falta asignar nivel de riesgo ARL'
      });
    }

    if (employee.contratoVencimiento) {
      const vencimiento = new Date(employee.contratoVencimiento);
      const hoy = new Date();
      const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
      
      if (diasRestantes <= 0) {
        indicators.push({
          type: 'contrato',
          status: 'vencido',
          message: 'Contrato vencido'
        });
      } else if (diasRestantes <= 30) {
        indicators.push({
          type: 'contrato',
          status: 'pendiente',
          message: `Contrato vence en ${diasRestantes} días`
        });
      }
    }

    return indicators;
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de modo soporte */}
      {isSupportMode && (
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                Modo Soporte Activo - Estás viendo datos de una empresa cliente
              </span>
              <Button variant="outline" size="sm" onClick={goBackToSupport}>
                Volver al Backoffice
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600">
            {filteredCount} de {totalEmployees} empleados
            {filters.searchTerm && ` - Filtrado por: "${filters.searchTerm}"`}
            {isSupportMode && " (Vista de Soporte)"}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowTest(!showTest)}
            className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {showTest ? 'Ocultar' : 'Mostrar'} Prueba
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={() => setIsImportDrawerOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            disabled={isExporting || employees.length === 0}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
          <Button onClick={handleCreateEmployee}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Componente de Prueba */}
      {showTest && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <EmployeeCreationTest />
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <EmployeeFiltersComponent
              filters={filters}
              onUpdateFilters={updateFilters}
              onClearFilters={clearFilters}
              totalCount={totalEmployees}
              filteredCount={filteredCount}
            />
          </CardContent>
        </Card>
      )}

      {selectedEmployees.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-blue-800">
                {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? 's' : ''} seleccionado{selectedEmployees.length !== 1 ? 's' : ''}
              </p>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('activo')}>
                  <UserCheck className="h-4 w-4 mr-1" />
                  Activar
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('inactivo')}>
                  <UserX className="h-4 w-4 mr-1" />
                  Desactivar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Listado de Empleados</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedEmployees.length === employees.length}
                      onCheckedChange={toggleAllEmployees}
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
                          onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.avatar} />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {employee.nombre[0]}{employee.apellido[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button 
                              onClick={() => openEmployeeProfile(employee)}
                              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left"
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
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600 ml-1">
                              {indicators.length}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEmployeeProfile(employee)}
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
                              <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(employee.id, 'activo')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(employee.id, 'inactivo')}>
                                <UserX className="h-4 w-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEmployee(employee.id)}
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
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empleados</h3>
              <p className="text-gray-600 mb-4">
                {filters.searchTerm || filters.estado || filters.tipoContrato
                  ? 'No se encontraron empleados con los filtros aplicados'
                  : 'Comienza agregando tu primer empleado'}
              </p>
              <Button onClick={handleCreateEmployee}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Empleado
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSuccess={() => {
          refreshEmployees();
          setIsFormModalOpen(false);
          setEditingEmployee(null);
        }}
      />

      <EmployeeDetailsModal
        isOpen={isEmployeeProfileOpen}
        onClose={closeEmployeeProfile}
        employee={selectedEmployee}
      />

      <ImportEmployeesDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        onImportComplete={() => {
          refreshEmployees();
          setIsImportDrawerOpen(false);
        }}
      />
    </div>
  );
};
