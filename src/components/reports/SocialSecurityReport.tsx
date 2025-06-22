
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Shield } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { SocialSecurityReport as SocialSecurityData } from '@/types/reports';

export const SocialSecurityReport = () => {
  const { filters, getSocialSecurityReport, exportToExcel, exportToPDF, loading } = useReports();
  const [data, setData] = useState<SocialSecurityData[]>([]);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    const reportData = await getSocialSecurityReport(filters);
    setData(reportData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = async () => {
    await exportToExcel('social-security', data, 'aportes_seguridad_social');
  };

  const handleExportPDF = async () => {
    await exportToPDF('social-security', data, 'aportes_seguridad_social');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Aportes a Seguridad Social</span>
            </CardTitle>
            <CardDescription>
              Salud, pensión, ARL y caja de compensación por empleado
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
                <TableHead className="text-right">Salud Empleado</TableHead>
                <TableHead className="text-right">Salud Empresa</TableHead>
                <TableHead className="text-right">Pensión Empleado</TableHead>
                <TableHead className="text-right">Pensión Empresa</TableHead>
                <TableHead className="text-right">ARL</TableHead>
                <TableHead className="text-right">Caja Compensación</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.employeeId}>
                  <TableCell className="font-medium">{item.employeeName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.healthEmployee)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.healthEmployer)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.pensionEmployee)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.pensionEmployer)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.arl)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.compensationBox)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          {data.length} empleado{data.length !== 1 ? 's' : ''} encontrado{data.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};
