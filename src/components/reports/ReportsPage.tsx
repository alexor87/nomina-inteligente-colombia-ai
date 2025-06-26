
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayrollSummaryReport } from './PayrollSummaryReport';
import { LaborCostReport } from './LaborCostReport';
import { SocialSecurityReport } from './SocialSecurityReport';
import { IncomeRetentionReport } from './IncomeRetentionReport';
import { AccountingExportReport } from './AccountingExportReport';
import { NoveltyHistoryReport } from './NoveltyHistoryReport';
import { ExportHistory } from './ExportHistory';
import { ReportsFilters } from './ReportsFilters';
import { useReports } from '@/hooks/useReports';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { 
  FileText, 
  TrendingUp, 
  Shield, 
  Calculator, 
  Download,
  Clock,
  AlertCircle
} from 'lucide-react';

export const ReportsPage = () => {
  const {
    filters,
    setFilters,
    exportHistory,
    loading,
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getIncomeRetentionCertificates,
    getNoveltyHistoryReport,
    getAccountingExports,
    exportToExcel,
    exportToPDF,
    exportToCSV
  } = useReports();

  // Add pagination for export history
  const pagination = usePagination(exportHistory, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 75, 100],
    storageKey: 'reports-history'
  });

  const [activeTab, setActiveTab] = useState('payroll-summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const reportTypes = [
    {
      id: 'payroll-summary',
      title: 'Resumen de Nómina',
      description: 'Consolidado general de nómina por período',
      icon: FileText,
      component: PayrollSummaryReport
    },
    {
      id: 'labor-cost',
      title: 'Costo Laboral',
      description: 'Análisis detallado de costos laborales',
      icon: TrendingUp,
      component: LaborCostReport
    },
    {
      id: 'social-security',
      title: 'Seguridad Social',
      description: 'Aportes y contribuciones patronales',
      icon: Shield,
      component: SocialSecurityReport
    },
    {
      id: 'income-retention',
      title: 'Retención en la Fuente',
      description: 'Cálculos de retención por empleado',
      icon: Calculator,
      component: IncomeRetentionReport
    },
    {
      id: 'accounting-export',
      title: 'Exportación Contable',
      description: 'Datos para sistemas contables',
      icon: Download,
      component: AccountingExportReport
    },
    {
      id: 'novelty-history',
      title: 'Historial de Novedades',
      description: 'Registro de novedades aplicadas',
      icon: Clock,
      component: NoveltyHistoryReport
    }
  ];

  const activeReportType = reportTypes.find(r => r.id === activeTab);
  const ActiveReportComponent = activeReportType?.component;

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      let data = [];
      switch (activeTab) {
        case 'payroll-summary':
          data = await getPayrollSummaryReport(filters);
          break;
        case 'labor-cost':
          data = await getLaborCostReport(filters);
          break;
        case 'social-security':
          data = await getSocialSecurityReport(filters);
          break;
        case 'income-retention':
          data = await getIncomeRetentionCertificates(new Date().getFullYear());
          break;
        case 'novelty-history':
          data = await getNoveltyHistoryReport(filters);
          break;
        case 'accounting-export':
          data = await getAccountingExports(filters);
          break;
        default:
          data = [];
      }
      setReportData(data);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (format: 'excel' | 'pdf' | 'csv') => {
    const fileName = `${activeTab}_${new Date().toISOString().split('T')[0]}`;
    
    switch (format) {
      case 'excel':
        await exportToExcel(activeTab, reportData, fileName);
        break;
      case 'pdf':
        await exportToPDF(activeTab, reportData, fileName);
        break;
      case 'csv':
        await exportToCSV(activeTab, reportData, fileName);
        break;
    }
  };

  const updateFilters = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
              <p className="text-sm text-gray-600 mt-1">
                Genera y gestiona reportes de nómina y recursos humanos
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleGenerateReport}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generando...' : 'Generar Reporte'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Card 
                  key={report.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    activeTab === report.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setActiveTab(report.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-6 w-6 ${
                        activeTab === report.id ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                      <div className="flex-1">
                        <h3 className={`font-medium ${
                          activeTab === report.id ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {report.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {report.description}
                        </p>
                        {activeTab === report.id && (
                          <Badge className="mt-2 bg-blue-100 text-blue-800">
                            Seleccionado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters - Simplified to avoid type issues */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Reporte</h3>
            <div className="text-sm text-gray-600">
              Filtros específicos para {activeReportType?.title}
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-white rounded-lg shadow">
            {ActiveReportComponent && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {activeReportType?.title}
                </h3>
                <div className="text-sm text-gray-600 mb-4">
                  {reportData.length} registros encontrados
                </div>
                {isGenerating ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Generando reporte...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <Button onClick={() => handleExportReport('excel')} size="sm">
                        Excel
                      </Button>
                      <Button onClick={() => handleExportReport('pdf')} size="sm">
                        PDF
                      </Button>
                      <Button onClick={() => handleExportReport('csv')} size="sm">
                        CSV
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Historial de Exportaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pagination.paginatedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <div className="font-medium">Exportación #{index + 1}</div>
                      <div className="text-sm text-gray-500">
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Descargar
                    </Button>
                  </div>
                ))}
              </div>
              
              <PaginationControls 
                pagination={pagination} 
                itemName="exportaciones"
              />
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
};
