import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SuperAdminService, CompanyWithSubscription } from '@/services/SuperAdminService';
import { PlanService } from '@/services/PlanService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Search, Eye, ArrowUpDown, Pause, Play, ChevronUp, ChevronDown, SlidersHorizontal, Download } from 'lucide-react';
import { AdminExportService } from '@/services/AdminExportService';

type SortField = 'razon_social' | 'created_at' | 'employee_count' | 'trial_ends_at';
type SortDir = 'asc' | 'desc';

const AdminCompaniesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [planDialog, setPlanDialog] = useState<{ open: boolean; company: CompanyWithSubscription | null }>({ open: false, company: null });
  const [newPlan, setNewPlan] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limits dialog state
  const [limitsDialog, setLimitsDialog] = useState<{ open: boolean; company: CompanyWithSubscription | null }>({ open: false, company: null });
  const [limitsMaxEmployees, setLimitsMaxEmployees] = useState<number>(10);
  const [limitsMaxPayrolls, setLimitsMaxPayrolls] = useState<number>(1);
  const [limitsReason, setLimitsReason] = useState('');

  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => SuperAdminService.getAllCompaniesWithSubscriptions()
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-active-plans'],
    queryFn: () => PlanService.getPlans(true)
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let result = companies?.filter(c => {
      const matchSearch = !search ||
        c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
        c.nit.includes(search);
      const effectivePlan = c.subscription?.plan_type || c.plan;
      const effectiveStatus = c.subscription?.status || c.estado;
      const matchPlan = filterPlan === 'all' || effectivePlan === filterPlan;
      const matchStatus = filterStatus === 'all' || effectiveStatus === filterStatus;
      return matchSearch && matchPlan && matchStatus;
    }) || [];

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'razon_social':
          cmp = a.razon_social.localeCompare(b.razon_social);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'employee_count':
          cmp = (a.employee_count || 0) - (b.employee_count || 0);
          break;
        case 'trial_ends_at': {
          const aDate = a.subscription?.trial_ends_at ? new Date(a.subscription.trial_ends_at).getTime() : 0;
          const bDate = b.subscription?.trial_ends_at ? new Date(b.subscription.trial_ends_at).getTime() : 0;
          cmp = aDate - bDate;
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [companies, search, filterPlan, filterStatus, sortField, sortDir]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'activa': return <Badge variant="success" className="text-xs">Activa</Badge>;
      case 'trial': return <Badge variant="info" className="text-xs">Trial</Badge>;
      case 'suspendida': return <Badge variant="destructive" className="text-xs">Suspendida</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status || 'N/A'}</Badge>;
    }
  };

  const getTrialBadge = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return <span className="text-muted-foreground text-xs">—</span>;
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const dateStr = new Date(trialEndsAt).toLocaleDateString('es-CO');
    if (daysLeft < 0) return <Badge variant="destructive" className="text-xs">Expirado</Badge>;
    if (daysLeft <= 7) return <Badge variant="warning" className="text-xs">{dateStr} ({daysLeft}d)</Badge>;
    return <span className="text-xs text-muted-foreground">{dateStr}</span>;
  };

  const handleChangePlan = async () => {
    if (!planDialog.company || !newPlan || !changeReason.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await SuperAdminService.changeCompanyPlan(planDialog.company.id, newPlan, changeReason, user.id);
      toast({ title: 'Plan actualizado', description: `Plan cambiado a ${newPlan}` });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      setPlanDialog({ open: false, company: null });
      setNewPlan('');
      setChangeReason('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (company: CompanyWithSubscription) => {
    const currentStatus = company.subscription?.status || company.estado;
    const newStatus = currentStatus === 'suspendida' ? 'activa' : 'suspendida';
    const reason = prompt(`Razón para ${newStatus === 'suspendida' ? 'suspender' : 'activar'} "${company.razon_social}":`);
    if (!reason || !user) return;

    try {
      await SuperAdminService.toggleCompanyStatus(company.id, newStatus as 'activa' | 'suspendida', reason, user.id);
      toast({ title: `Empresa ${newStatus}`, description: company.razon_social });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openLimitsDialog = (company: CompanyWithSubscription) => {
    setLimitsDialog({ open: true, company });
    setLimitsMaxEmployees(company.subscription?.max_employees ?? 10);
    setLimitsMaxPayrolls(company.subscription?.max_payrolls_per_month ?? 1);
    setLimitsReason('');
  };

  const handleUpdateLimits = async () => {
    if (!limitsDialog.company || !limitsReason.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await SuperAdminService.updateCompanyLimits(
        limitsDialog.company.id,
        limitsMaxEmployees,
        limitsMaxPayrolls,
        limitsReason,
        user.id
      );
      toast({ title: 'Límites actualizados', description: `${limitsDialog.company.razon_social}: ${limitsMaxEmployees} empleados, ${limitsMaxPayrolls} nóminas/mes` });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setLimitsDialog({ open: false, company: null });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLimitsCell = (company: CompanyWithSubscription) => {
    const max = company.subscription?.max_employees ?? null;
    const current = company.employee_count || 0;
    if (max === null) return <span className="text-muted-foreground text-xs">—</span>;
    const pct = Math.min((current / max) * 100, 100);
    return (
      <div className="min-w-[80px]">
        <span className="text-xs font-medium text-foreground">{current}/{max}</span>
        <Progress value={pct} className={`h-1.5 mt-1 ${pct >= 90 ? '[&>div]:bg-destructive' : pct >= 70 ? '[&>div]:bg-yellow-500' : ''}`} />
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Empresas</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} empresas</p>
        </div>
        <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={() => AdminExportService.exportCompaniesToExcel(filtered)}>
          <Download className="h-4 w-4 mr-2" /> Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por razón social o NIT..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            {plans.map(p => <SelectItem key={p.plan_id} value={p.plan_id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activa">Activa</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspendida">Suspendida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando empresas...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('razon_social')}>
                      <span className="flex items-center">Empresa<SortIcon field="razon_social" /></span>
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">NIT</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('employee_count')}>
                      <span className="flex items-center">Límites<SortIcon field="employee_count" /></span>
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('trial_ends_at')}>
                      <span className="flex items-center">Trial expira<SortIcon field="trial_ends_at" /></span>
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center">Registro<SortIcon field="created_at" /></span>
                    </th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(company => {
                    const effectivePlan = company.subscription?.plan_type || company.plan;
                    const effectiveStatus = company.subscription?.status || company.estado;
                    return (
                      <tr key={company.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium text-foreground">{company.razon_social}</td>
                        <td className="p-3 text-muted-foreground">{company.nit}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="capitalize text-xs">{effectivePlan || 'N/A'}</Badge>
                        </td>
                        <td className="p-3">{getStatusBadge(effectiveStatus)}</td>
                        <td className="p-3">{getLimitsCell(company)}</td>
                        <td className="p-3">{getTrialBadge(company.subscription?.trial_ends_at ?? null)}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(company.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/companies/${company.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openLimitsDialog(company)} title="Editar límites">
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setPlanDialog({ open: true, company }); setNewPlan(effectivePlan || 'basico'); }}>
                              <ArrowUpDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(company)}>
                              {effectiveStatus === 'suspendida' ? <Play className="h-3.5 w-3.5 text-green-600" /> : <Pause className="h-3.5 w-3.5 text-red-600" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No se encontraron empresas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Change Dialog */}
      <Dialog open={planDialog.open} onOpenChange={open => !open && setPlanDialog({ open: false, company: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan — {planDialog.company?.razon_social}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nuevo Plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.plan_id} value={p.plan_id}>
                      {p.nombre} — {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio)}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Razón del cambio *</Label>
              <Textarea value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Describe la razón del cambio de plan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false, company: null })}>Cancelar</Button>
            <Button onClick={handleChangePlan} disabled={!changeReason.trim() || isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Confirmar Cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limits Edit Dialog */}
      <Dialog open={limitsDialog.open} onOpenChange={open => !open && setLimitsDialog({ open: false, company: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Límites — {limitsDialog.company?.razon_social}</DialogTitle>
            <DialogDescription>Ajusta los límites de empleados y nóminas para esta empresa sin cambiar su plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Máximo de empleados</Label>
              <Input type="number" min={1} value={limitsMaxEmployees} onChange={e => setLimitsMaxEmployees(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Actualmente: {limitsDialog.company?.employee_count ?? 0} empleados</p>
            </div>
            <div>
              <Label>Máximo de nóminas por mes</Label>
              <Input type="number" min={1} value={limitsMaxPayrolls} onChange={e => setLimitsMaxPayrolls(Number(e.target.value))} />
            </div>
            <div>
              <Label>Razón del ajuste *</Label>
              <Textarea value={limitsReason} onChange={e => setLimitsReason(e.target.value)} placeholder="Describe por qué se ajustan los límites..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsDialog({ open: false, company: null })}>Cancelar</Button>
            <Button onClick={handleUpdateLimits} disabled={!limitsReason.trim() || isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Límites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompaniesPage;
