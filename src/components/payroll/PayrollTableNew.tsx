
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Search, Download, Calculator, Plus, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { NovedadType, NOVEDAD_TYPE_LABELS } from '@/types/novedades-enhanced';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';

interface PayrollTableNewProps {
  periodId: string;
  companyId: string;
  onPeriodRefresh?: () => void;
}

export const PayrollTableNew: React.FC<PayrollTableNewProps> = ({ periodId, companyId, onPeriodRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Fetch employees for the company
  const { data: employeesData, isLoading: isEmployeesLoading, error: employeesError, refetch: refetchEmployees } = useQuery({
    queryKey: ['employees-for-company', companyId],
    queryFn: async () => {
      const result = await EmployeeUnifiedService.getAll();
      return result.data || [];
    },
    enabled: !!companyId,
  });

  const employees = useMemo(() => {
    return (employeesData || []).filter(employee =>
      employee.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.cedula.includes(searchTerm)
    );
  }, [employeesData, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants = {
      'activo': 'bg-green-100 text-green-800',
      'inactivo': 'bg-red-100 text-red-800',
      'vacaciones': 'bg-blue-100 text-blue-800',
      'incapacidad': 'bg-yellow-100 text-yellow-800'
    };

    const labels = {
      'activo': 'Activo',
      'inactivo': 'Inactivo',
      'vacaciones': 'Vacaciones',
      'incapacidad': 'Incapacidad'
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (isEmployeesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (employeesError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error: {employeesError.message}
            <Button onClick={() => refetchEmployees()} className="ml-4">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nómina</h2>
          <p className="text-gray-600">
            Período: {periodId}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lista de Empleados
            <Button onClick={() => refetchEmployees()}>
              <Calculator className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Empleado</th>
                  <th className="text-left p-4">Cédula</th>
                  <th className="text-left p-4">Cargo</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Salario Base</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </div>
                    </td>
                    <td className="p-4">{employee.cedula}</td>
                    <td className="p-4">{employee.cargo || 'No especificado'}</td>
                    <td className="p-4">{getStatusBadge(employee.estado)}</td>
                    <td className="p-4 font-bold text-green-600">
                      {formatCurrency(employee.salarioBase)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
