import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, FileEdit, DollarSign } from 'lucide-react';
import { useUnifiedPeriodEdit, PeriodNovedad } from '@/contexts/UnifiedPeriodEditContext';
import { formatCurrency } from '@/lib/utils';
import { AddNovedadToUnifiedPeriodModal } from '../modals/AddNovedadToUnifiedPeriodModal';

export const NovedadesManagementTab: React.FC = () => {
  const { editState, removeNovedad } = useUnifiedPeriodEdit();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Get unique employees for filter
  const uniqueEmployees = editState.employees
    .filter(emp => !emp.isRemoved)
    .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`));

  // Filter novedades
  const filteredNovedades = editState.novedades
    .filter(nov => !nov.isRemoved)
    .filter(nov => {
      if (filterEmployee !== 'all' && nov.employee_id !== filterEmployee) return false;
      if (filterType !== 'all' && nov.tipo_novedad !== filterType) return false;
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const employee = editState.employees.find(emp => emp.id === nov.employee_id);
        const employeeName = employee ? `${employee.nombre} ${employee.apellido}`.toLowerCase() : '';
        return employeeName.includes(search) || 
               nov.tipo_novedad.toLowerCase().includes(search) ||
               (nov.subtipo?.toLowerCase().includes(search)) ||
               (nov.observacion?.toLowerCase().includes(search));
      }
      return true;
    });

  const getNovedadStatus = (novedad: PeriodNovedad) => {
    if (novedad.isNew) return 'new';
    if (novedad.isModified) return 'modified';
    if (novedad.isRemoved) return 'removed';
    return 'existing';
  };

  const getStatusBadge = (novedad: PeriodNovedad) => {
    const status = getNovedadStatus(novedad);
    switch (status) {
      case 'new':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Nueva</Badge>;
      case 'modified':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Modificada</Badge>;
      case 'removed':
        return <Badge variant="secondary" className="bg-red-100 text-red-700">Removida</Badge>;
      default:
        return null;
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = editState.employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.nombre} ${employee.apellido}` : 'Empleado no encontrado';
  };

  const handleRemoveNovedad = (novedadId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta novedad?')) {
      removeNovedad(novedadId);
    }
  };

  const handleAddNovedad = (employeeId?: string) => {
    setSelectedEmployeeId(employeeId || '');
    setShowAddModal(true);
  };

  const getTotalValue = () => {
    return filteredNovedades.reduce((sum, nov) => sum + nov.valor, 0);
  };

  // Get unique novedad types for filter
  const uniqueTypes = Array.from(new Set(editState.novedades.map(nov => nov.tipo_novedad)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Novedades</h3>
          <p className="text-sm text-muted-foreground">
            Administra las novedades que afectan los cálculos de nómina
          </p>
        </div>
        <Button onClick={() => handleAddNovedad()}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Novedad
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar novedades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los empleados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los empleados</SelectItem>
            {uniqueEmployees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.nombre} {emp.apellido}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {uniqueTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          {filteredNovedades.length} novedad{filteredNovedades.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-sm text-green-600 font-medium">Novedades Nuevas</div>
              <div className="text-lg font-bold text-green-700">
                {editState.novedades.filter(nov => nov.isNew && !nov.isRemoved).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="text-sm text-yellow-600 font-medium">Modificadas</div>
              <div className="text-lg font-bold text-yellow-700">
                {editState.novedades.filter(nov => nov.isModified && !nov.isRemoved).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-sm text-red-600 font-medium">Eliminadas</div>
              <div className="text-lg font-bold text-red-700">
                {editState.novedades.filter(nov => nov.isRemoved).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm text-blue-600 font-medium">Valor Total</div>
              <div className="text-lg font-bold text-blue-700">
                {formatCurrency(getTotalValue())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Novedades Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Subtipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNovedades.map((novedad) => (
              <TableRow 
                key={novedad.id}
                className={
                  novedad.isNew ? 'bg-green-50' : 
                  novedad.isModified ? 'bg-yellow-50' : 
                  undefined
                }
              >
                <TableCell>
                  <div className="font-medium">{getEmployeeName(novedad.employee_id)}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {novedad.tipo_novedad.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{novedad.subtipo || '-'}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(novedad.valor)}
                </TableCell>
                <TableCell>{novedad.dias || '-'}</TableCell>
                <TableCell>
                  {novedad.fecha_inicio && novedad.fecha_fin ? (
                    <div className="text-sm">
                      <div>{novedad.fecha_inicio}</div>
                      <div className="text-muted-foreground">a {novedad.fecha_fin}</div>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(novedad)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddNovedad(novedad.employee_id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveNovedad(novedad.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredNovedades.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm || filterEmployee !== 'all' || filterType !== 'all' 
              ? 'No se encontraron novedades que coincidan con los filtros'
              : 'No hay novedades en este período'
            }
          </div>
        )}
      </div>

      {/* Add Novedad Modal */}
      <AddNovedadToUnifiedPeriodModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        preselectedEmployeeId={selectedEmployeeId}
      />
    </div>
  );
};