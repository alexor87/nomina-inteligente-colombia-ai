import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SuperAdminService, CompanyWithSubscription } from '@/services/SuperAdminService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Search, Eye, ArrowUpDown, Pause, Play } from 'lucide-react';
import { PLANES_SAAS } from '@/constants';

const AdminCompaniesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Plan change dialog state
  const [planDialog, setPlanDialog] = useState<{ open: boolean; company: CompanyWithSubscription | null }>({ open: false, company: null });
  const [newPlan, setNewPlan] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => SuperAdminService.getAllCompaniesWithSubscriptions()
  });

  const filtered = companies?.filter(c => {
    const matchSearch = !search || 
      c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      c.nit.includes(search);
    const effectivePlan = c.subscription?.plan_type || c.plan;
    const effectiveStatus = c.subscription?.status || c.estado;
    const matchPlan = filterPlan === 'all' || effectivePlan === filterPlan;
    const matchStatus = filterStatus === 'all' || effectiveStatus === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  }) || [];

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'activa': return <Badge className="bg-green-100 text-green-800 text-xs">Activa</Badge>;
      case 'trial': return <Badge className="bg-blue-100 text-blue-800 text-xs">Trial</Badge>;
      case 'suspendida': return <Badge className="bg-red-100 text-red-800 text-xs">Suspendida</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status || 'N/A'}</Badge>;
    }
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestión de Empresas</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} empresas</p>
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
            {PLANES_SAAS.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
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
                    <th className="text-left p-3 font-medium text-muted-foreground">Empresa</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">NIT</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Empleados</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Registro</th>
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
                        <td className="p-3 text-right text-foreground">{company.employee_count}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(company.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/companies/${company.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
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
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No se encontraron empresas</td></tr>
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
                  {PLANES_SAAS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
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
    </div>
  );
};

export default AdminCompaniesPage;
