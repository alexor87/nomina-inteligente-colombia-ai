
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, User } from 'lucide-react';
import { useReports } from '@/hooks/useReports';

export const ExportHistory = () => {
  const { exportHistory } = useReports();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO');
  };

  const getReportTypeLabel = (reportType: string) => {
    const labels = {
      'payroll-summary': 'Resumen de Nómina',
      'labor-costs': 'Costos Laborales',
      'social-security': 'Seguridad Social',
      'income-retention': 'Certificados CIR',
      'novelty-history': 'Histórico Novedades',
      'accounting-export': 'Exportación Contable'
    };
    return labels[reportType as keyof typeof labels] || reportType;
  };

  const getFormatBadgeVariant = (format: string) => {
    switch (format) {
      case 'excel': return 'default';
      case 'pdf': return 'secondary';
      case 'csv': return 'outline';
      default: return 'outline';
    }
  };

  const handleDownload = (exportItem: any) => {
    // Simular descarga
    console.log('Downloading:', exportItem.fileName);
    // En producción aquí se haría la descarga real del archivo
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Historial de Exportaciones</span>
        </CardTitle>
        <CardDescription>
          Revisa y descarga reportes generados anteriormente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {exportHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay exportaciones previas</p>
            <p className="text-sm">Los reportes que generes aparecerán aquí</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Reporte</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Generado por</span>
                  </TableHead>
                  <TableHead className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Fecha</span>
                  </TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getReportTypeLabel(item.reportType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.fileName}</TableCell>
                    <TableCell>
                      <Badge variant={getFormatBadgeVariant(item.format)}>
                        {item.format.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.generatedBy}</TableCell>
                    <TableCell>{formatDate(item.generatedAt)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(item)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Descargar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {exportHistory.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {exportHistory.length} exportacion{exportHistory.length !== 1 ? 'es' : ''} en el historial
          </div>
        )}
      </CardContent>
    </Card>
  );
};
