import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, DollarSign, Eye, Search } from 'lucide-react';
import { PayrollDomainService } from '@/services/PayrollDomainService';
import { usePagination } from '@/hooks/usePagination';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  empleados_count: number;
  total_neto: number;
  total_devengado: number;
  total_deducciones: number;
  estado: 'draft' | 'active' | 'closed';
  has_adjustments?: boolean;
}

export const PayrollHistoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPeriods = periods.filter(period => {
    const matchesYear = !yearFilter || new Date(period.fecha_inicio).getFullYear().toString() === yearFilter;
    const matchesType = !typeFilter || period.tipo_periodo === typeFilter;
    const matchesSearch = !searchQuery || 
      period.periodo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      period.empleados_count.toString().includes(searchQuery);
    
    return matchesYear && matchesType && matchesSearch;
  });

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedItems,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    canGoNext,
    canGoPrevious
  } = usePagination(filteredPeriods, { defaultPageSize: 10 });

  const loadHistory = async () => {
    try {
      setLoading(true);
      const history = await PayrollDomainService.getPayrollHistory();
      
      // Only show closed periods
      const closedPeriods = history.filter(period => period.estado === 'closed');
      setPeriods(closedPeriods);
    } catch (error) {
      console.error('Error loading payroll history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de nómina",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const getAvailableYears = () => {
    const years = [...new Set(periods.map(period => 
      new Date(period.fecha_inicio).getFullYear()
    ))].sort((a, b) => b - a);
    return years;
  };

  const getStatusBadge = (period: PayrollPeriod) => {
    if (period.has_adjustments) {
      return <Badge variant="secondary">Con ajuste</Badge>;
    }
    return <Badge variant="outline">Original</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Nómina</h1>
          <p className="text-muted-foreground">
            Consulta períodos liquidados, ajustes y comprobantes generados
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por período o número de empleados..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los años</SelectItem>
                  {getAvailableYears().map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo de período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {filteredPeriods.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin períodos liquidados</h3>
              <p className="text-muted-foreground">
                {periods.length === 0 
                  ? "Aún no tienes períodos liquidados." 
                  : "No se encontraron períodos que coincidan con los filtros aplicados."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Períodos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredPeriods.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredPeriods.reduce((sum, period) => sum + period.empleados_count, 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(filteredPeriods.reduce((sum, period) => sum + period.total_neto, 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Períodos Liquidados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Período</th>
                      <th className="text-left p-4 font-medium">Tipo</th>
                      <th className="text-left p-4 font-medium">Empleados</th>
                      <th className="text-left p-4 font-medium">Total Neto</th>
                      <th className="text-left p-4 font-medium">Estado</th>
                      <th className="text-left p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((period) => (
                      <tr key={period.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{period.periodo}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(period.fecha_inicio).toLocaleDateString()} - {new Date(period.fecha_fin).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="capitalize">
                            {period.tipo_periodo}
                          </Badge>
                        </td>
                        <td className="p-4">{period.empleados_count}</td>
                        <td className="p-4 font-mono">{formatCurrency(period.total_neto)}</td>
                        <td className="p-4">{getStatusBadge(period)}</td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/app/payroll-history/${period.id}`)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredPeriods.length)} de {filteredPeriods.length} períodos
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={!canGoPrevious}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={!canGoNext}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};