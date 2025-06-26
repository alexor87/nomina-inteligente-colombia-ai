
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, Download } from 'lucide-react';

const BillingHistoryPage = () => {
  const billingHistory = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'Plan Profesional - Enero 2024',
      amount: '$299.000',
      status: 'Pagado',
      invoice: 'INV-2024-001'
    },
    {
      id: '2',
      date: '2023-12-15',
      description: 'Plan Profesional - Diciembre 2023',
      amount: '$299.000',
      status: 'Pagado',
      invoice: 'INV-2023-012'
    },
    {
      id: '3',
      date: '2023-11-15',
      description: 'Plan Profesional - Noviembre 2023',
      amount: '$299.000',
      status: 'Pagado',
      invoice: 'INV-2023-011'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Historial de Facturación</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Facturas</span>
          </CardTitle>
          <CardDescription>
            Historial completo de tus facturas y pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {new Date(item.date).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="font-medium">{item.amount}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.invoice}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingHistoryPage;
