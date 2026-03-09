import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanService, SubscriptionPlan, PlanFormData } from '@/services/PlanService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/components/ui/table';
import { Plus, Pencil, ToggleLeft, ToggleRight, Package } from 'lucide-react';

const emptyForm: PlanFormData = {
  plan_id: '',
  nombre: '',
  precio: 0,
  max_employees: 10,
  max_payrolls_per_month: 1,
  caracteristicas: [],
  sort_order: 0,
};

const AdminPlansPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [featuresText, setFeaturesText] = useState('');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => PlanService.getPlans(),
  });

  const createMutation = useMutation({
    mutationFn: (data: PlanFormData) => PlanService.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ title: 'Plan creado exitosamente' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlanFormData> }) =>
      PlanService.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ title: 'Plan actualizado' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      PlanService.togglePlanStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ title: 'Estado actualizado' });
    },
  });

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ ...emptyForm, sort_order: plans.length + 1 });
    setFeaturesText('');
    setDialogOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({
      plan_id: plan.plan_id,
      nombre: plan.nombre,
      precio: plan.precio,
      max_employees: plan.max_employees,
      max_payrolls_per_month: plan.max_payrolls_per_month,
      caracteristicas: plan.caracteristicas,
      sort_order: plan.sort_order,
    });
    setFeaturesText(plan.caracteristicas.join('\n'));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = () => {
    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean);
    const data: PlanFormData = { ...form, caracteristicas: features };

    if (!data.plan_id || !data.nombre) {
      toast({ title: 'ID y nombre son obligatorios', variant: 'destructive' });
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Gestión de Planes</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Crear Plan
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Máx. Empleados</TableHead>
              <TableHead>Máx. Nóminas/mes</TableHead>
              <TableHead>Características</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Cargando planes...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay planes configurados
                </TableCell>
              </TableRow>
            ) : (
              plans.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.sort_order}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.plan_id}</code>
                  </TableCell>
                  <TableCell className="font-medium">{plan.nombre}</TableCell>
                  <TableCell>{formatCurrency(plan.precio)}</TableCell>
                  <TableCell>{plan.max_employees >= 9999 ? '∞' : plan.max_employees}</TableCell>
                  <TableCell>{plan.max_payrolls_per_month >= 9999 ? '∞' : plan.max_payrolls_per_month}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.caracteristicas.slice(0, 2).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {plan.caracteristicas.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{plan.caracteristicas.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleMutation.mutate({ id: plan.id, isActive: !plan.is_active })}
                      >
                        {plan.is_active
                          ? <ToggleRight className="h-4 w-4 text-green-600" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ID (slug único)</Label>
                <Input
                  value={form.plan_id}
                  onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
                  placeholder="ej: premium"
                  disabled={!!editingPlan}
                />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej: Premium"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Precio (COP)</Label>
                <Input
                  type="number"
                  value={form.precio}
                  onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Máx. Empleados</Label>
                <Input
                  type="number"
                  value={form.max_employees}
                  onChange={e => setForm(f => ({ ...f, max_employees: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Máx. Nóminas/mes</Label>
                <Input
                  type="number"
                  value={form.max_payrolls_per_month}
                  onChange={e => setForm(f => ({ ...f, max_payrolls_per_month: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>Orden</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Características (una por línea)</Label>
              <Textarea
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                placeholder="Nómina básica&#10;Reportes simples&#10;Soporte email"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlansPage;
