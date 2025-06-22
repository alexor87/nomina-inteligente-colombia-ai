
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, TrendingUp } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { PayrollSummaryReport as PayrollSummaryData } from '@/types/reports';

export const PayrollSummaryReport = () => {
  const { filters, getPayrollSummaryReport, exportToExcel, exportToPDF, loading } = useReports();
  const [data, setData] = useState<PayrollSummaryData[]>([]);
  const [totals, setTotals] = useState({
    totalEarnings: 0,
    totalDeductions: 0,
    netPay: 0,
    employerContributions: 0
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    const reportData = await getPayrollSummaryReport(filters);
    setData(reportData);
    
    // Calculate totals
    const newTotals = reportData.reduce((acc, item) => ({
      totalEarnings: acc.totalEarnings + item.totalEarnings,
      totalDeductions: acc.totalDeductions + item.totalDeductions,
      netPay: acc.netPay + item.netPay,
      employerContributions: acc.employerContributions + item.employerContributions
    }), { totalEarnings: 0, totalDeductions: 0, netPay: 0, employerContributions: 0 });
    
    setTotals(newTotals);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = async () => {
    await exportToExcel('payroll-summary', data, 'resumen_nomina');
  };

  const handleExportPDF = async () => {
    await exportToPDF('payroll-summary', data, 'resumen_nomina');
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devengado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalEarnings)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deducciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalDeductions)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neto a Pagar</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.netPay)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aportes Patronales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.employerContributions)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Resumen de Nómina por Período</span>
              </CardTitle>
              <CardDescription>
                Devengado, deducciones, neto y aportes por empleado
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
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Devengado</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Aportes</TableHead>
                  <TableHead>Centro de Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={`${item.employeeId}-${item.period}`}>
                    <TableCell className="font-medium">{item.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.period}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalEarnings)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalDeductions)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.netPay)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.employerContributions)}</TableCell>
                    <TableCell>
                      {item.costCenter && (
                        <Badge variant="secondary">{item.costCenter}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {data.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Totales:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Devengado:</span> {formatCurrency(totals.totalEarnings)}
                </div>
                <div>
                  <span className="font-medium">Deducciones:</span> {formatCurrency(totals.totalDeductions)}
                </div>
                <div>
                  <span className="font-medium">Neto:</span> {formatCurrency(totals.netPay)}
                </div>
                <div>
                  <span className="font-medium">Aportes:</span> {formatCurrency(totals.employerContributions)}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-sm text-muted-foreground">
            {data.length} empleado{data.length !== 1 ? 's' : ''} encontrado{data.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
