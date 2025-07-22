
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Filter, FileText, Calendar, Users, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface FilterState {
  year: string;
  periodType: string;
  search: string;
}

export const PayrollHistoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    year: new Date().getFullYear().toString(),
    periodType: 'all',
    search: ''
  });

  const { periods, loading, error, loadHistory } = usePayrollHistory();

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleViewDetail = (periodId: string) => {
    navigate(`/app/payroll-history/${periodId}`);
  };

  // Generar años dinámicamente
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i.toString());
    }
    return years;
  };

  // Filtrar períodos
  const filteredPeriods = periods.filter(period => {
    const periodYear = new Date(period.startDate).getFullYear().toString();
    const matchesYear = filters.year === 'all' || periodYear === filters.year;
    const matchesType = filters.periodType === 'all' || period.type === filters.periodType;
    const matchesSearch = filters.search === '' || 
      period.period.toLowerCase().includes(filters.search.toLowerCase());
    
    // Solo mostrar períodos liquidados (cerrados o procesados)
    const isSettled = period.status === 'cerrado' || period.status === 'procesada';
    
    return matchesYear && matchesType && matchesSearch && isSettled;
  });

  const getStatusBadge = (status: string, hasAdjustments: boolean) => {
    if (hasAdjustments) {
      return <Badge variant="secondary">Con ajuste</Badge>;
    }
    return <Badge variant="default">Original</Badge>;
  };

  const getPeriodTypeLabel = (type: string) => {
    const labels = {
      'quincenal': 'Quincenal',
      'mensual': 'Mensual',
      'semanal': 'Semanal'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error",
      description: "No se pudo cargar el historial de nómina",
      variant: "destructive"
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Nómina</h1>
          <p className="text-gray-600">
            Consulta períodos liquidados y genera comprobantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-500">
            {filteredPeriods.length} períodos encontrados
          </span>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Año</label>
              <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {generateYears().map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de período</label>
              <Select value={filters.periodType} onValueChange={(value) => handleFilterChange('periodType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Buscar período</label>
              <Input
                placeholder="Buscar por nombre..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ year: new Date().getFullYear().toString(), periodType: 'all', search: '' })}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de períodos */}
      <Card>
        <CardHeader>
          <CardTitle>Períodos Liquidados</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPeriods.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {periods.length === 0 ? 'Aún no hay períodos liquidados' : 'No se encontraron períodos'}
              </h3>
              <p className="text-gray-600">
                {periods.length === 0 
                  ? 'Cuando liquides una nómina, aparecerá aquí.'
                  : 'Intenta ajustar los filtros para encontrar los períodos que buscas.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rango del período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      Empleados
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-4 w-4" />
                      Total neto
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{period.period}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(period.startDate).toLocaleDateString('es-ES')} - {' '}
                          {new Date(period.endDate).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPeriodTypeLabel(period.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        {period.employeesCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(period.totalNetPay)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(period.status, false)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(period.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollHistoryPage;
