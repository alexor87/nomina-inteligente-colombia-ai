
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, History, Clock, DollarSign } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { NoveltyHistoryReport as NoveltyHistoryData, noveltyTypeLabels, getNoveltyTypeBadgeVariant } from '@/types/reports';

export const NoveltyHistoryReport = () => {
  const { filters, getNoveltyHistoryReport, exportToExcel, exportToPDF, loading } = useReports();
  const [data, setData] = useState<NoveltyHistoryData[]>([]);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    const reportData = await getNoveltyHistoryReport(filters);
    setData(reportData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'approved': 'Aprobado',
      'pending': 'Pendiente',
      'rejected': 'Rechazado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleExportExcel = async () => {
    await exportToExcel('novelty-history', data, 'historico_novedades');
  };

  const handleExportPDF = async () => {
    await exportToPDF('novelty-history', data, 'historico_novedades');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Histórico de Novedades</span>
            </CardTitle>
            <CardDescription>
              Horas extra, incapacidades, licencias, bonificaciones y otras novedades
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.employeeName}</TableCell>
                  <TableCell>
                    <Badge variant={getNoveltyTypeBadgeVariant(item.type)}>
                      {noveltyTypeLabels[item.type] || item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">
                    {item.amount ? (
                      <span className="flex items-center justify-end">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {formatCurrency(item.amount)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.hours ? (
                      <span className="flex items-center justify-end">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.hours}h
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          {data.length} novedad{data.length !== 1 ? 'es' : ''} encontrada{data.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};
