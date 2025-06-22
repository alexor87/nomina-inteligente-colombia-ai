
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Receipt, Calendar } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { IncomeRetentionCertificate } from '@/types/reports';

export const IncomeRetentionReport = () => {
  const { getIncomeRetentionCertificates, exportToPDF, loading } = useReports();
  const [data, setData] = useState<IncomeRetentionCertificate[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    const reportData = await getIncomeRetentionCertificates(selectedYear);
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
      case 'generated': return 'default';
      case 'sent': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'generated': return 'Generado';
      case 'sent': return 'Enviado';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  const handleGenerateIndividual = async (employeeId: string) => {
    const employee = data.find(d => d.employeeId === employeeId);
    if (employee) {
      await exportToPDF('income-retention', [employee], `cir_${employee.employeeName}_${selectedYear}`);
    }
  };

  const handleGenerateBatch = async () => {
    await exportToPDF('income-retention', data, `cir_todos_${selectedYear}`);
  };

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Filtro por Año Fiscal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <Label htmlFor="year">Año fiscal</Label>
              <Input
                id="year"
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-32"
                min="2020"
                max={new Date().getFullYear()}
              />
            </div>
            <Button onClick={handleGenerateBatch} disabled={loading || data.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Generar Todos en Lote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Report Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Certificados de Ingresos y Retenciones (CIR)</span>
              </CardTitle>
              <CardDescription>
                Certificados anuales por empleado - Año {selectedYear}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Total Ingresos</TableHead>
                  <TableHead className="text-right">Total Retenciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Generación</TableHead>
                  <TableHead>Fecha Envío</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.employeeId}>
                    <TableCell className="font-medium">{item.employeeName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalIncome)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalRetentions)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.generatedAt ? new Date(item.generatedAt).toLocaleDateString('es-CO') : '-'}
                    </TableCell>
                    <TableCell>
                      {item.sentAt ? new Date(item.sentAt).toLocaleDateString('es-CO') : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateIndividual(item.employeeId)}
                        disabled={loading}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            {data.length} certificado{data.length !== 1 ? 's' : ''} para el año {selectedYear}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
