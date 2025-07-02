
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
    getAccountingExports
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
    setIsLoading(true);
    setError(null);
    
    try {
      let reportData = [];
      
      switch (reportType) {
        case 'payroll-summary':
        case 'cost-centers':
          reportData = await getPayrollSummaryReport(filters);
          break;
        case 'labor-costs':
          reportData = await getLaborCostReport(filters);
          break;
        case 'social-security':
        case 'ugpp-social-security':
          reportData = await getSocialSecurityReport(filters);
          break;
        case 'novelty-report':
        case 'hr-novelties':
        case 'ugpp-novelties':
          reportData = await getNoveltyHistoryReport(filters);
          break;
        case 'employee-detail':
        case 'employee-detail-hr':
          reportData = await getPayrollSummaryReport(filters);
          break;
        case 'accounting-provisions':
          reportData = await getAccountingExports(filters);
          break;
        default:
          // Generate mock data for other report types
          reportData = generateMockData(reportType);
      }
      
      setData(reportData);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Error al cargar los datos del reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = (type: string) => {
    // Generate appropriate mock data based on report type
    const mockData = [];
    const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
    
    for (let i = 0; i < 20; i++) {
      switch (type) {
        case 'contracts':
        case 'ugpp-contracts':
          mockData.push({
            employeeId: `EMP-${i + 1}`,
            employeeName: employees[i % employees.length],
            contractType: ['indefinido', 'termino_fijo', 'obra_labor'][i % 3],
            startDate: `2024-${(i % 12) + 1}-01`,
            status: ['activo', 'inactivo'][i % 2],
            salary: 1500000 + (i * 100000)
          });
          break;
          
        case 'absences':
        case 'hr-absences':
          mockData.push({
            employeeId: `EMP-${i + 1}`,
            employeeName: employees[i % employees.length],
            absenceType: ['licencia', 'incapacidad', 'vacaciones'][i % 3],
            startDate: `2024-01-${(i % 28) + 1}`,
            endDate: `2024-01-${(i % 28) + 5}`,
            days: (i % 10) + 1,
            status: 'aprobada'
          });
          break;
          
        default:
          mockData.push({
            id: i + 1,
            name: `Registro ${i + 1}`,
            value: Math.random() * 1000000,
            date: `2024-01-${(i % 28) + 1}`
          });
      }
    }
    
    return mockData;
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
      'ugpp-contracts': 'Contratos - UGPP'
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
            <TableHead>Total Devengado</TableHead>
            <TableHead>Total Deducciones</TableHead>
            <TableHead>Neto Pagado</TableHead>
            <TableHead>Centro de Costo</TableHead>
          </TableRow>
        );
        
      case 'labor-costs':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Salario Base</TableHead>
            <TableHead>Beneficios</TableHead>
            <TableHead>Horas Extra</TableHead>
            <TableHead>Aportes Patronales</TableHead>
            <TableHead>Costo Total</TableHead>
          </TableRow>
        );
        
      case 'social-security':
      case 'ugpp-social-security':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Salud Empleado</TableHead>
            <TableHead>Salud Empleador</TableHead>
            <TableHead>Pensión Empleado</TableHead>
            <TableHead>Pensión Empleador</TableHead>
            <TableHead>ARL</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        );
        
      case 'contracts':
      case 'ugpp-contracts':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Tipo Contrato</TableHead>
            <TableHead>Fecha Inicio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Salario</TableHead>
          </TableRow>
        );
        
      case 'absences':
      case 'hr-absences':
        return (
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Tipo Ausencia</TableHead>
            <TableHead>Fecha Inicio</TableHead>
            <TableHead>Fecha Fin</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        );
        
      default:
        return (
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Valor</TableHead>
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
              <TableCell>{formatCurrency(item.totalEarnings)}</TableCell>
              <TableCell>{formatCurrency(item.totalDeductions)}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(item.netPay)}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.costCenter}</Badge>
              </TableCell>
            </TableRow>
          );
          
        case 'labor-costs':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>{formatCurrency(item.baseSalary)}</TableCell>
              <TableCell>{formatCurrency(item.benefits)}</TableCell>
              <TableCell>{formatCurrency(item.overtime)}</TableCell>
              <TableCell>{formatCurrency(item.employerContributions)}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(item.totalCost)}</TableCell>
            </TableRow>
          );
          
        case 'social-security':
        case 'ugpp-social-security':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>{formatCurrency(item.healthEmployee)}</TableCell>
              <TableCell>{formatCurrency(item.healthEmployer)}</TableCell>
              <TableCell>{formatCurrency(item.pensionEmployee)}</TableCell>
              <TableCell>{formatCurrency(item.pensionEmployer)}</TableCell>
              <TableCell>{formatCurrency(item.arl)}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(item.total)}</TableCell>
            </TableRow>
          );
          
        case 'contracts':
        case 'ugpp-contracts':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.contractType}</Badge>
              </TableCell>
              <TableCell>{new Date(item.startDate).toLocaleDateString('es-ES')}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'activo' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>{formatCurrency(item.salary)}</TableCell>
            </TableRow>
          );
          
        case 'absences':
        case 'hr-absences':
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.employeeName}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.absenceType}</Badge>
              </TableCell>
              <TableCell>{new Date(item.startDate).toLocaleDateString('es-ES')}</TableCell>
              <TableCell>{new Date(item.endDate).toLocaleDateString('es-ES')}</TableCell>
              <TableCell>{item.days}</TableCell>
              <TableCell>
                <Badge variant="default">{item.status}</Badge>
              </TableCell>
            </TableRow>
          );
          
        default:
          return (
            <TableRow key={index}>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{formatCurrency(item.value)}</TableCell>
              <TableCell>{item.date}</TableCell>
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
            <Badge variant="outline">{data.length} registros</Badge>
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
            <span>Cargando datos del reporte...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
            <p className="text-gray-600">No se encontraron registros para los filtros seleccionados.</p>
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
