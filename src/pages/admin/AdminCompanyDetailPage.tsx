import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SuperAdminService } from '@/services/SuperAdminService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Users, Receipt, History, SlidersHorizontal, CalendarPlus } from 'lucide-react';

const AdminCompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-company-detail', companyId],
    queryFn: () => SuperAdminService.getCompanyDetail(companyId!),
    enabled: !!companyId
  });

  // Limits dialog state
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [maxEmployees, setMaxEmployees] = useState(10);
  const [maxPayrolls, setMaxPayrolls] = useState(1);
  const [limitsReason, setLimitsReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trial extension state
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialDate, setTrialDate] = useState('');
  const [trialReason, setTrialReason] = useState('');

  const openLimitsDialog = () => {
    setMaxEmployees(data?.subscription?.max_employees ?? 10);
    setMaxPayrolls(data?.subscription?.max_payrolls_per_month ?? 1);
    setLimitsReason('');
    setLimitsOpen(true);
  };

  const handleUpdateLimits = async () => {
    if (!companyId || !limitsReason.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await SuperAdminService.updateCompanyLimits(companyId, maxEmployees, maxPayrolls, limitsReason, user.id);
      toast({ title: 'Límites actualizados' });
      queryClient.invalidateQueries({ queryKey: ['admin-company-detail', companyId] });
      setLimitsOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>;
  }

  if (!data?.company) {
    return <div className="p-8 text-muted-foreground">Empresa no encontrada</div>;
  }

  const { company, subscription, employees, users: companyUsers, events } = data;
  const empCount = employees.length;
  const maxEmp = subscription?.max_employees ?? null;
  const empPct = maxEmp ? Math.min((empCount / maxEmp) * 100, 100) : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/companies')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{company.razon_social}</h1>
          <p className="text-muted-foreground text-sm">NIT: {company.nit} • {company.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge variant="outline" className="capitalize">{company.estado}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize font-medium">{company.plan}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ciudad</span><span>{company.ciudad || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Representante</span><span>{company.representante_legal || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Registro</span><span>{new Date(company.created_at).toLocaleDateString('es-CO')}</span></div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> Suscripción</CardTitle>
              {subscription && (
                <Button variant="ghost" size="sm" onClick={openLimitsDialog} title="Editar límites">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Límites
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize font-medium">{subscription.plan_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge variant="outline" className="capitalize">{subscription.status}</Badge></div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Empleados</span>
                  <div className="text-right">
                    <span className="font-medium">{empCount}/{subscription.max_employees}</span>
                    <Progress value={empPct} className={`h-1.5 w-20 mt-1 ${empPct >= 90 ? '[&>div]:bg-destructive' : empPct >= 70 ? '[&>div]:bg-yellow-500' : ''}`} />
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Máx. nóminas/mes</span><span>{subscription.max_payrolls_per_month}</span></div>
                {subscription.trial_ends_at && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Trial hasta</span><span>{new Date(subscription.trial_ends_at).toLocaleDateString('es-CO')}</span></div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Sin suscripción configurada</p>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Usuarios ({companyUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {companyUsers.length > 0 ? companyUsers.map((u: any) => (
              <div key={u.id} className="flex justify-between items-center py-1">
                <span>{u.first_name} {u.last_name}</span>
                <div className="flex gap-1">
                  {u.roles?.map((r: any) => (
                    <Badge key={r.role} variant="secondary" className="text-xs capitalize">{r.role}</Badge>
                  ))}
                </div>
              </div>
            )) : <p className="text-muted-foreground">Sin usuarios</p>}
          </CardContent>
        </Card>
      </div>

      {/* Employees Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Empleados ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-muted-foreground font-medium">Nombre</th>
                    <th className="text-left p-2 text-muted-foreground font-medium">Cargo</th>
                    <th className="text-left p-2 text-muted-foreground font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 20).map((emp: any) => (
                    <tr key={emp.id} className="border-b border-border">
                      <td className="p-2">{emp.nombre} {emp.apellido}</td>
                      <td className="p-2 text-muted-foreground">{emp.cargo || 'N/A'}</td>
                      <td className="p-2"><Badge variant="outline" className="text-xs capitalize">{emp.estado}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length > 20 && <p className="text-xs text-muted-foreground p-2">Mostrando 20 de {employees.length}</p>}
            </div>
          ) : <p className="text-muted-foreground text-sm">Sin empleados registrados</p>}
        </CardContent>
      </Card>

      {/* Subscription Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Historial de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {event.previous_plan !== event.new_plan
                        ? `Plan: ${event.previous_plan || 'N/A'} → ${event.new_plan}`
                        : `Estado: ${event.previous_status || 'N/A'} → ${event.new_status}`}
                    </p>
                    <p className="text-muted-foreground text-xs">{event.reason}</p>
                    <p className="text-muted-foreground text-xs mt-1">{new Date(event.created_at).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-sm">Sin eventos registrados</p>}
        </CardContent>
      </Card>

      {/* Limits Edit Dialog */}
      <Dialog open={limitsOpen} onOpenChange={setLimitsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Límites — {company.razon_social}</DialogTitle>
            <DialogDescription>Ajusta los límites sin cambiar el plan de la empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Máximo de empleados</Label>
              <Input type="number" min={1} value={maxEmployees} onChange={e => setMaxEmployees(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Actualmente: {empCount} empleados</p>
            </div>
            <div>
              <Label>Máximo de nóminas por mes</Label>
              <Input type="number" min={1} value={maxPayrolls} onChange={e => setMaxPayrolls(Number(e.target.value))} />
            </div>
            <div>
              <Label>Razón del ajuste *</Label>
              <Textarea value={limitsReason} onChange={e => setLimitsReason(e.target.value)} placeholder="Describe por qué se ajustan los límites..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateLimits} disabled={!limitsReason.trim() || isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Límites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompanyDetailPage;
