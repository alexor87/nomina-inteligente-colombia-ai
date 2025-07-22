
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  History, 
  Calendar, 
  Users, 
  DollarSign,
  Filter,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { HistoryServiceAleluya, PayrollPeriodHistory } from '@/services/HistoryServiceAleluya';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ PÁGINA PRINCIPAL DE HISTORIAL DE NÓMINA
 * Lista paginada de períodos liquidados con filtros
 */
export const PayrollHistoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [periods, setPeriods] = useState<PayrollPeriodHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    type: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false
  });

  const loadPeriods = async (page: number = 1) => {
    try {
      setLoading(true);
      const filterParams = {
        year: filters.year,
        type: filters.type === 'all' ? undefined : filters.type,
        page,
        limit: pagination.limit
      };

      const result = await HistoryServiceAleluya.getPayrollHistory(filterParams);
      
      setPeriods(result.periods);
      setPagination(prev => ({
        ...prev,
        page,
        total: result.total,
        hasMore: result.hasMore
      }));
    } catch (error) {
      console.error('Error loading periods:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los períodos liquidados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods(1);
  }, [filters]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleViewDetail = (periodId: string) => {
    navigate(`/app/payroll-history/${periodId}`);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push(year);
    }
    return years;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'original':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Original</Badge>;
      case 'con_ajuste':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Con ajuste</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getTypeDisplay = (type: string) => {
    const typeMap = {
      'mensual': 'Mensual',
      'quincenal': 'Quincenal',
      'semanal': 'Semanal'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  if (loading && periods.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <History className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Nómina</h1>
            <p className="text-gray-600">Consulta períodos liquidados y genera comprobantes</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={() => loadPeriods(pagination.page)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Año</label>
              <Select
                value={filters.year.toString()}
                onValueChange={(value) => handleFilterChange('year', parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateYearOptions().map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo de período</label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de períodos */}
      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <History className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">No hay períodos liquidados</h3>
                <p className="text-gray-600 mt-1">
                  Aún no has liquidado ningún período. Una vez liquides tu primera nómina, aparecerá aquí.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => (
            <Card key={period.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{period.period}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(period.startDate).toLocaleDateString('es-ES')} - {' '}
                          {new Date(period.endDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="bg-gray-50">
                        {getTypeDisplay(period.type)}
                      </Badge>
                      {getStatusBadge(period.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{period.employeesCount} empleados</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {formatCurrency(period.totalNetPay)}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(period.id)}
                      className="flex items-center space-x-2"
                    >
                      <span>Ver detalle</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Paginación */}
          <div className="flex justify-center items-center space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={() => loadPeriods(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              Anterior
            </Button>
            
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <Button
              variant="outline"
              onClick={() => loadPeriods(pagination.page + 1)}
              disabled={!pagination.hasMore || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollHistoryPage;
