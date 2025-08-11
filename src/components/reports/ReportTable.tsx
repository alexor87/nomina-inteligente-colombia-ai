
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { ReportFilters } from '@/types/reports';
import { useReports } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { usePagination } from '@/hooks/usePagination';

interface ReportTableProps {
  reportType: string;
  filters: ReportFilters;
  onExport: (format: 'excel' | 'pdf', data: any[]) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  reportType,
  filters,
  onExport
}) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getNoveltyHistoryReport,
    getAccountingExports,
    getIncomeRetentionCertificates,
    getDianStatusReport,
    getPilaPreliquidation
  } = useReports();

  const pagination = usePagination(data, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 100],
    storageKey: `report-${reportType}`
  });

  useEffect(() => {
    loadReportData();
  }, [reportType, filters]);

  const loadReportData = async () => {
    console.log('🔄 ReportTable: Loading real data for:', reportType);
    setIsLoading(true);
    setError(null);
    
    try {
      let reportData = [];
      
      // CARGAR DATOS REALES SEGÚN EL TIPO DE REPORTE
      switch (reportType) {
        case 'payroll-summary':
        case 'cost-centers':
        case 'employee-detail':
        case 'employee-detail-hr':
          console.log('📊 Loading payroll summary data...');
          reportData = await getPayrollSummaryReport(filters);
          break;
          
        case 'labor-costs':
          console.log('📊 Loading labor costs data...');
          reportData = await getLaborCostReport(filters);
          break;
          
        case 'social-security':
        case 'ugpp-social-security':
          console.log('📊 Loading social security data...');
          reportData = await getSocialSecurityReport(filters);
          break;
          
        case 'novelty-report':
        case 'hr-novelties':
        case 'ugpp-novelties':
          console.log('📊 Loading novelty history data...');
          reportData = await getNoveltyHistoryReport(filters);
          break;
          
        case 'accounting-provisions':
          console.log('📊 Loading accounting exports data...');
          reportData = await getAccountingExports(filters);
          break;

        case 'contracts':
        case 'ugpp-contracts':
          console.log('📊 Loading contracts data from employees...');
          // Usar datos de empleados para contratos
          reportData = await getEmployeeContractsData();
          break;
          
        case 'absences':
        case 'hr-absences':
          console.log('📊 Loading absences data from novelties...');
          // Filtrar novedades por tipos de ausencias
          const absenceFilters = {
            ...filters,
            noveltyTypes: ['incapacidad', 'licencia', 'vacaciones']
          };
          reportData = await getNoveltyHistoryReport(absenceFilters);
          break;

        case 'dian-status':
          console.log('📊 Loading DIAN electronic payroll status...');
          reportData = await getDianStatusReport(filters);
          break;

        case 'pila-preliquidation':
          console.log('📊 Loading PILA preliquidation aggregates...');
          reportData = await getPilaPreliquidation(filters);
          break;
          
        default:
          console.warn('⚠️ Unknown report type:', reportType);
          reportData = [];
      }
      
      console.log('✅ ReportTable: Data loaded successfully:', reportData.length, 'records');
      setData(reportData);
      
    } catch (err) {
      console.error('❌ ReportTable: Error loading report data:', err);
      setError('Error al cargar los datos del reporte');
    } finally {
      setIsLoading(false);
    }
  };

  // Función auxiliar para datos de contratos desde empleados
  const getEmployeeContractsData = async () => {
    // Esto sería implementado usando ReportsDBService en una versión futura
    // Por ahora retornamos array vacío para evitar errores
    console.log('📝 Contract data would be loaded from employees table');
    return [];
  };

  const getReportTitle = () => {
    const titles: Record<string, string> = {
      'payroll-summary': 'Resumen de Nómina por Período',
      'cost-centers': 'Costos por Centro de Costos',
      'labor-costs': 'Reporte de Costos Laborales',
      'social-security': 'Seguridad Social y Parafiscales',
      'employee-detail': 'Detalle de Nómina por Empleado',
      'novelty-report': 'Reporte de Novedades',
      'contracts': 'Contratos y Vinculaciones',
      'absences': 'Reporte de Ausentismos',
      'accounting-provisions': 'Provisiones Contables',
      'hr-novelties': 'Novedades de Personal',
      'hr-absences': 'Ausentismos de Personal',
      'ugpp-social-security': 'Seguridad Social - UGPP',
      'ugpp-novelties': 'Novedades Relevantes - UGPP',
      'ugpp-contracts': 'Contratos - UGPP',
      'dian-status': 'DIAN - Estado Nómina Electrónica',
      'pila-preliquidation': 'PILA - Preliquidación'
    };
    
    return titles[reportType] || 'Reporte';
  };

  const renderTableHeaders = () => {
    switch (reportType) {
      case 'payroll-summary':
      case 'employee-detail':
      case 'employee-detail-hr':
      case 'cost-centers':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Total Devengado</TableHead>
            <TableHead className="text-right">Total Deducciones</TableHead>
            <TableHead className="text-right">Neto Pagado</TableHead>
            <TableHead>Centro de Costo</TableHead>
          </TableRow>
        );
        
      case 'labor-costs':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead className="text-right">Salario Base</TableHead>
            <TableHead className="text-right">Beneficios</TableHead>
            <TableHead className="text-right">Horas Extra</TableHead>
            <TableHead className="text-right">Aportes Patronales</TableHead>
            <TableHead className="text-right">Costo Total</TableHead>
          </TableRow>
        );
        
      case 'social-security':
      case 'ugpp-social-security':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead className="text-right">Salud Empleado</TableHead>
            <TableHead className="text-right">Salud Empleador</TableHead>
            <TableHead className="text-right">Pensión Empleado</TableHead>
            <TableHead className="text-right">Pensión Empleador</TableHead>
            <TableHead className="text-right">ARL</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        );

      case 'novelty-report':
      case 'hr-novelties':
      case 'ugpp-novelties':
      case 'absences':
      case 'hr-absences':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Horas</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        );
        
      
      case 'dian-status':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Estado DIAN</TableHead>
            <TableHead>Enviado</TableHead>
            <TableHead>CUFE</TableHead>
            <TableHead>PDF</TableHead>
          </TableRow>
        );

      case 'pila-preliquidation':
        return (
          <TableRow>
            <TableHead>Entidad</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Empleados</TableHead>
            <TableHead className="text-right">Total Aportes</TableHead>
          </TableRow>
        );
        
      default:
        return (
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        );
    }
  };

  const renderTableRows = () => {
    return pagination.paginatedItems.map((item, index) => {
      switch (reportType) {
        case 'payroll-summary':
        case 'employee-detail':
        case 'employee-detail-hr':
        case 'cost-centers':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>{item.period}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.totalEarnings)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.totalDeductions)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.netPay)}</TableCell>
              <TableCell>
                {item.costCenter && (
                  <Badge variant="outline">{item.costCenter}</Badge>
                )}
              </TableCell>
            </TableRow>
          );
          
        case 'labor-costs':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.baseSalary)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.benefits)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.overtime)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.employerContributions)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
            </TableRow>
          );
          
        case 'social-security':
        case 'ugpp-social-security':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.healthEmployee)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.healthEmployer)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.pensionEmployee)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.pensionEmployer)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.arl)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
            </TableRow>
          );

        case 'novelty-report':
        case 'hr-novelties':
        case 'ugpp-novelties':
        case 'absences':
        case 'hr-absences':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.type}</Badge>
              </TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right">
                {item.amount ? formatCurrency(item.amount) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {item.hours ? `${item.hours}h` : '-'}
              </TableCell>
              <TableCell>{new Date(item.date).toLocaleDateString('es-ES')}</TableCell>
              <TableCell>
                <Badge variant="default">{item.status}</Badge>
              </TableCell>
            </TableRow>
          );
          
        case 'dian-status':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>{item.period}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.status || 'pendiente'}</Badge>
              </TableCell>
              <TableCell>{item.sentDate ? new Date(item.sentDate).toLocaleString('es-ES') : '-'}</TableCell>
              <TableCell className="truncate max-w-[200px]">{item.cufe || '-'}</TableCell>
              <TableCell>
                {item.pdfUrl ? (
                  <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="underline text-blue-600">PDF</a>
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          );

        case 'pila-preliquidation':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.entity}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.entityType}</Badge>
              </TableCell>
              <TableCell>{item.employeesCount}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
            </TableRow>
          );
          
        default:
          return (
            <TableRow key={index}>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.name || item.description || 'Sin descripción'}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.value || item.amount || 0)}</TableCell>
              <TableCell>{item.date ? new Date(item.date).toLocaleDateString('es-ES') : '-'}</TableCell>
            </TableRow>
          );
      }
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el reporte</h3>
          <p className="text-gray-600 text-center">{error}</p>
          <Button onClick={loadReportData} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{getReportTitle()}</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{data.length} registros reales</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('excel', data)}
              disabled={isLoading || data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('pdf', data)}
              disabled={isLoading || data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando datos reales del reporte...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
            <p className="text-gray-600">No se encontraron registros reales para los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                {renderTableHeaders()}
              </TableHeader>
              <TableBody>
                {renderTableRows()}
              </TableBody>
            </Table>
            
            <PaginationControls pagination={pagination} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
