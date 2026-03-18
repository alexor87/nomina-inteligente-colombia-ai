import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, FileSpreadsheet, Loader2, CreditCard, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';
import { SuperAdminService, BillingRecord, BillingSummary } from '@/services/SuperAdminService';
import { AdminExportService } from '@/services/AdminExportService';
import { useToast } from '@/hooks/use-toast';

const now = new Date();
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const statusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  pagado: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-800' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const AdminBillingPage: React.FC = () => {
  const { toast } = useToast();
  const [period, setPeriod] = useState(currentPeriod);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [summary, setSummary] = useState<BillingSummary>({ total: 0, paid: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [markingOverdue, setMarkingOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Payment dialog
  const [payDialog, setPayDialog] = useState<BillingRecord | null>(null);
  const [payForm, setPayForm] = useState({ method: 'transferencia', reference: '', notes: '' });
  const [paying, setPaying] = useState(false);

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, sum] = await Promise.all([
        SuperAdminService.getBillingRecords(period),
        SuperAdminService.getBillingSummary(period),
      ]);
      setRecords(recs);
      setSummary(sum);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la facturación', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const result = await SuperAdminService.generateMonthlyBilling(period);
      toast({ title: 'Facturación generada', description: `${result.created} creados, ${result.skipped} ya existían` });
      await loadData();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkOverdue = async () => {
    try {
      setMarkingOverdue(true);
      const result = await SuperAdminService.markOverdueBilling();
      toast({ title: 'Vencidos actualizados', description: `${result.updated} registros marcados como vencidos` });
      await loadData();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setMarkingOverdue(false);
    }
  };

  const handlePay = async () => {
    if (!payDialog || !payForm.reference.trim()) {
      toast({ title: 'Referencia requerida', variant: 'destructive' });
      return;
    }
    try {
      setPaying(true);
      await SuperAdminService.registerPayment(payDialog.id, payDialog.company_id, payForm.method, payForm.reference, payForm.notes);
      toast({ title: 'Pago registrado' });
      setPayDialog(null);
      setPayForm({ method: 'transferencia', reference: '', notes: '' });
      await loadData();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  const filtered = records.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !r.company_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturación</h1>
          <p className="text-muted-foreground">Gestión de cobros y pagos por periodo</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-44" />
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
            Generar Facturación
          </Button>
          <Button variant="outline" onClick={handleMarkOverdue} disabled={markingOverdue}>
            {markingOverdue ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Marcar Vencidos
          </Button>
          <Button variant="outline" onClick={() => AdminExportService.exportBillingToExcel(records, period)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Facturado</div>
            <div className="text-2xl font-bold">{fmt(summary.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Cobrado</div>
            <div className="text-2xl font-bold text-green-700">{fmt(summary.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-600" /> Pendiente</div>
            <div className="text-2xl font-bold text-yellow-700">{fmt(summary.pending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-600" /> Vencido</div>
            <div className="text-2xl font-bold text-red-700">{fmt(summary.overdue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registros del periodo {period} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay registros de facturación para este periodo</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const sc = statusConfig[r.status] || statusConfig.pendiente;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.company_name || r.company_id}</TableCell>
                      <TableCell>{r.plan_type || '—'}</TableCell>
                      <TableCell>{fmt(Number(r.amount))}</TableCell>
                      <TableCell><Badge className={sc.color}>{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(r.due_date).toLocaleDateString('es-CO')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.payment_reference || '—'}</TableCell>
                      <TableCell>
                        {r.status === 'pendiente' && (
                          <Button size="sm" variant="outline" onClick={() => setPayDialog(r)}>
                            Registrar Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={open => !open && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago — {payDialog?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto</Label>
              <Input value={payDialog ? fmt(Number(payDialog.amount)) : ''} disabled />
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="PSE">PSE</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia de pago *</Label>
              <Input
                value={payForm.reference}
                onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="Nro. de transacción"
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Button onClick={handlePay} disabled={paying} className="w-full">
              {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBillingPage;
