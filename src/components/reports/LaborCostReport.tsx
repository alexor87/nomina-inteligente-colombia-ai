
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, DollarSign, TrendingUp } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { LaborCostReport as LaborCostData } from '@/types/reports';

export const LaborCostReport = () => {
  const { filters, getLaborCostReport, exportToExcel, exportToPDF, loading } = useReports();
  const [data, setData] = useState<LaborCostData[]>([]);
  const [totals, setTotals] = useState({
    baseSalary: 0,
    benefits: 0,
    overtime: 0,
    bonuses: 0,
    employerContributions: 0,
    totalCost: 0
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    const reportData = await getLaborCostReport(filters);
    setData(reportData);
    
    const newTotals = reportData.reduce((acc, item) => ({
      baseSalary: acc.baseSalary + item.baseSalary,
      benefits: acc.benefits + item.benefits,
      overtime: acc.overtime + item.overtime,
      bonuses: acc.bonuses + item.bonuses,
      employerContributions: acc.employerContributions + item.employerContributions,
      totalCost: acc.totalCost + item.totalCost
    }), { baseSalary: 0, benefits: 0, overtime: 0, bonuses: 0, employerContributions: 0, totalCost: 0 });
    
    setTotals(newTotals);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateBenefitLoad = (baseSalary: number, totalCost: number) => {
    if (baseSalary === 0) return 0;
    return ((totalCost - baseSalary) / baseSalary * 100);
  };

  const handleExportExcel = async () => {
    await exportToExcel('labor-costs', data, 'costos_laborales');
  };

  const handleExportPDF = async () => {
    await exportToPDF('labor-costs', data, 'costos_laborales');
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalCost)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carga Prestacional Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0 ? 
                (data.reduce((acc, item) => acc + calculateBenefitLoad(item.baseSalary, item.totalCost), 0) / data.length).toFixed(1) 
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Promedio por Empleado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.length > 0 ? totals.totalCost / data.length : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Costos Laborales por Empleado</span>
              </CardTitle>
              <CardDescription>
                Carga prestacional, bonificaciones, extras y aportes patronales
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
                  <TableHead className="text-right">Salario Base</TableHead>
                  <TableHead className="text-right">Prestaciones</TableHead>
                  <TableHead className="text-right">Horas Extra</TableHead>
                  <TableHead className="text-right">Bonificaciones</TableHead>
                  <TableHead className="text-right">Aportes</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                  <TableHead className="text-right">% Carga</TableHead>
                  <TableHead>Centro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.employeeId}>
                    <TableCell className="font-medium">{item.employeeName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.baseSalary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.benefits)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.overtime)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.bonuses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.employerContributions)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={calculateBenefitLoad(item.baseSalary, item.totalCost) > 50 ? "destructive" : "secondary"}>
                        {calculateBenefitLoad(item.baseSalary, item.totalCost).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.costCenter && (
                        <Badge variant="outline">{item.costCenter}</Badge>
                      )}
                    </TableCell>
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
    </div>
  );
};
