
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayrollHistoryTable } from './PayrollHistoryTable';
import { PayrollHistoryFilters } from './PayrollHistoryFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Search, Filter, Calendar, Users, CheckCircle, AlertCircle, Clock, FileText, Edit } from 'lucide-react';
import { PayrollHistoryPeriod, PayrollHistoryFilters as FiltersType } from '@/types/payroll-history';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { toast } from '@/hooks/use-toast';

export const PayrollHistoryPage = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [filteredPeriods, setFilteredPeriods] = useState<PayrollHistoryPeriod[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {},
    status: '',
    costCenter: '',
    periodType: undefined,
    employeeSearch: ''
  });

  const {
    isLoading,
    isExporting,
    canUserReopenPeriods: canUserEditPeriods,
    checkUserPermissions,
    exportToExcel
  } = usePayrollHistory();

  useEffect(() => {
    loadPayrollHistory();
    checkUserPermissions();
  }, [checkUserPermissions]);

  useEffect(() => {
    applyFilters();
  }, [periods, filters, searchTerm]);

  const loadPayrollHistory = async () => {
    try {
      const data = await PayrollHistoryService.getHistoryPeriods();
      setPeriods(data);
    } catch (error) {
      console.error('Error loading payroll history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de nómina",
        variant: "destructive"
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...periods];

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.period.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.periodType) {
      filtered = filtered.filter(p => p.type === filters.periodType);
    }

    if (filters.dateRange.from) {
      filtered = filtered.filter(p => new Date(p.startDate) >= new Date(filters.dateRange.from!));
    }

    if (filters.dateRange.to) {
      filtered = filtered.filter(p => new Date(p.endDate) <= new Date(filters.dateRange.to!));
    }

    if (filters.employeeSearch) {
      filtered = filtered.filter(p => 
        p.period.toLowerCase().includes(filters.employeeSearch!.toLowerCase())
      );
    }

    setFilteredPeriods(filtered);
  };

  const getMetrics = () => {
    const total = periods.length;
    const cerrados = periods.filter(p => p.status === 'cerrado').length;
    const borrador = periods.filter(p => p.status === 'borrador').length;
    const editados = periods.filter(p => p.status === 'editado').length;
    const conErrores = periods.filter(p => p.status === 'con_errores').length;
    const reabiertos = periods.filter(p => p.status === 'reabierto').length;

    return { total, cerrados, borrador, editados, conErrores, reabiertos };
  };

  const handlePeriodClick = (period: PayrollHistoryPeriod) => {
    navigate(`/app/payroll-history/${period.id}`);
  };

  const handleViewDetails = (period: PayrollHistoryPeriod) => {
    navigate(`/app/payroll-history/${period.id}`);
  };

  const handleEditPeriod = (period: PayrollHistoryPeriod) => {
    navigate(`/app/payroll-history/${period.id}/edit`);
  };

  const handleExportToExcel = async () => {
    await exportToExcel(filteredPeriods);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metrics = getMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Historial de Nómina</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona y consulta el historial de períodos de nómina procesados
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleExportToExcel}
                disabled={isExporting}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Excel'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Períodos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Borrador</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{metrics.borrador}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.cerrados}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Editados</CardTitle>
              <Edit className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.editados}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reabiertos</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.reabiertos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Errores</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.conErrores}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar empleado o período..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <PayrollHistoryFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <PayrollHistoryTable
            periods={filteredPeriods}
            onPeriodClick={handlePeriodClick}
            onViewDetails={handleViewDetails}
            onEditPeriod={handleEditPeriod}
            canUserEditPeriods={canUserEditPeriods}
          />
        </div>
      </div>
    </div>
  );
};
