import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SuperAdminService } from '@/services/SuperAdminService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Users, Receipt, History } from 'lucide-react';

const AdminCompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-company-detail', companyId],
    queryFn: () => SuperAdminService.getCompanyDetail(companyId!),
    enabled: !!companyId
  });

  if (isLoading) {
    return <div className="p-8"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>;
  }

  if (!data?.company) {
    return <div className="p-8 text-muted-foreground">Empresa no encontrada</div>;
  }

  const { company, subscription, employees, users, events } = data;

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
            <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> Suscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize font-medium">{subscription.plan_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge variant="outline" className="capitalize">{subscription.status}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Máx. empleados</span><span>{subscription.max_employees}</span></div>
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
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Usuarios ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {users.length > 0 ? users.map((u: any) => (
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
    </div>
  );
};

export default AdminCompanyDetailPage;
