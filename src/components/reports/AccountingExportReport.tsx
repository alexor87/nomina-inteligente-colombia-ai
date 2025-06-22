
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { AccountingExport, AccountingEntry } from '@/types/reports';

export const AccountingExportReport = () => {
  const { filters, getAccountingExports, exportToExcel, loading } = useReports();
  const [data, setData] = useState<AccountingExport[]>([]);
  const [selectedExport, setSelectedExport] = useState<AccountingExport | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    const reportData = await getAccountingExports(filters);
    setData(reportData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = async (accountingExport: AccountingExport) => {
    await exportToExcel('accounting-export', accountingExport.accountingEntries, `contable_${accountingExport.period}`);
  };

  const handleViewDetails = (accountingExport: AccountingExport) => {
    setSelectedExport(selectedExport?.id === accountingExport.id ? null : accountingExport);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Exportaciones Contables</span>
              </CardTitle>
              <CardDescription>
                Reportes descargables listos para cargar a software contable
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-center">Asientos</TableHead>
                  <TableHead>Fecha Generación</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.period}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{item.accountingEntries.length}</Badge>
                    </TableCell>
                    <TableCell>{new Date(item.generatedAt).toLocaleDateString('es-CO')}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          {selectedExport?.id === item.id ? 'Ocultar' : 'Ver'} Detalles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportExcel(item)}
                          disabled={loading}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Excel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            {data.length} exportacion{data.length !== 1 ? 'es' : ''} encontrada{data.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Detailed View */}
      {selectedExport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span>Detalle de Asientos Contables - {selectedExport.period}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedExport.accountingEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{entry.account}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Débitos:</span> {formatCurrency(
                    selectedExport.accountingEntries.reduce((acc, entry) => acc + entry.debit, 0)
                  )}
                </div>
                <div>
                  <span className="font-medium">Total Créditos:</span> {formatCurrency(
                    selectedExport.accountingEntries.reduce((acc, entry) => acc + entry.credit, 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
