import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, ChevronDown, ChevronUp, Plus, FileText, Download, Calculator, Users, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayrollModern } from '@/hooks/usePayrollModern';
import { PayrollEmployeeRow } from './PayrollEmployeeRow';
import { PayrollModernFilters } from './PayrollModernFilters';
import { PayrollModernStats } from './PayrollModernStats';
import { PayrollEmployeeModern } from '@/types/payroll-modern';
import { useToast } from '@/hooks/use-toast';

interface PayrollModernTableProps {
  periodId: string;
}

export const PayrollModernTable: React.FC<PayrollModernTableProps> = ({ periodId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    field: keyof PayrollEmployeeModern;
    direction: 'asc' | 'desc';
  }>({
    field: 'nombre',
    direction: 'asc'
  });

  const { toast } = useToast();

  const {
    employees,
    isLoading,
    error,
    totals,
    loadEmployees,
    updateEmployee,
    bulkUpdateEmployees,
    exportPayroll,
    refreshNovedades
  } = usePayrollModern(periodId);

  useEffect(() => {
    if (periodId) {
      loadEmployees();
    }
  }, [periodId, loadEmployees]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp =>
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cedula.includes(searchTerm)
    );

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [employees, searchTerm, sortConfig]);

  const handleSort = (field: keyof PayrollEmployeeModern) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectRow = (employeeId: string) => {
    setSelectedRows(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredEmployees.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredEmployees.map(emp => emp.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedRows.length === 0) {
      toast({
        title: "Selección requerida",
        description: "Selecciona al menos un empleado",
        variant: "destructive"
      });
      return;
    }

    try {
      switch (action) {
        case 'export':
          await exportPayroll(selectedRows);
          break;
        case 'calculate':
          await bulkUpdateEmployees(selectedRows);
          break;
        default:
          break;
      }
      
      toast({
        title: "Acción completada",
        description: `Se procesaron ${selectedRows.length} empleados`,
      });
      
      setSelectedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error cargando la nómina: {error.message}</p>
            <Button onClick={() => loadEmployees()} variant="outline" className="mt-4">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <PayrollModernStats totals={totals} />

      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedRows.length} seleccionados
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('calculate')}
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    Calcular
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('export')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                </div>
              )}
              
              <Button onClick={() => exportPayroll()}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar Todo
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <PayrollModernFilters />
          </CardContent>
        )}
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th 
                    className="p-4 text-left font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('nombre')}
                  >
                    <div className="flex items-center gap-2">
                      Empleado
                      {sortConfig.field === 'nombre' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('salarioBase')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Salario Base
                      {sortConfig.field === 'salarioBase' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-right font-medium text-gray-900">Devengos</th>
                  <th className="p-4 text-right font-medium text-gray-900">Deducciones</th>
                  <th 
                    className="p-4 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalNeto')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Neto a Pagar
                      {sortConfig.field === 'totalNeto' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-center font-medium text-gray-900">Estado</th>
                  <th className="p-4 text-center font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <PayrollEmployeeRow
                    key={employee.id}
                    employee={employee}
                    isSelected={selectedRows.includes(employee.id)}
                    onSelect={() => handleSelectRow(employee.id)}
                    onUpdate={updateEmployee}
                    periodId={periodId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron empleados
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay empleados en este período'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
