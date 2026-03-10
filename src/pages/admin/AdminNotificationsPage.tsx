import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Plus, Trash2, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { SuperAdminService, AdminNotification } from '@/services/SuperAdminService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const priorityConfig = {
  info: { label: 'Info', icon: Info, color: 'bg-blue-100 text-blue-800' },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800' },
  critical: { label: 'Crítico', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
};

const AdminNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'info',
    target_plans: '',
    target_statuses: '',
    expires_at: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const notifs = await SuperAdminService.getNotifications();
      setNotifications(notifs);
      if (notifs.length > 0) {
        const counts = await SuperAdminService.getNotificationReadCounts(notifs.map(n => n.id));
        setReadCounts(counts);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudieron cargar las notificaciones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'Campos requeridos', description: 'Título y mensaje son obligatorios', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      await SuperAdminService.createNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        target_plans: form.target_plans ? form.target_plans.split(',').map(s => s.trim()) : null,
        target_statuses: form.target_statuses ? form.target_statuses.split(',').map(s => s.trim()) : null,
        expires_at: form.expires_at || null,
        created_by: user?.id || '',
      });
      toast({ title: 'Notificación creada' });
      setDialogOpen(false);
      setForm({ title: '', message: '', priority: 'info', target_plans: '', target_statuses: '', expires_at: '' });
      await loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo crear la notificación', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await SuperAdminService.deleteNotification(id);
      toast({ title: 'Notificación eliminada' });
      await loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const isExpired = (n: AdminNotification) => n.expires_at && new Date(n.expires_at) < new Date();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificaciones del Sistema</h1>
          <p className="text-muted-foreground">Envía comunicaciones a las empresas de la plataforma</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Crear Notificación</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Notificación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  maxLength={120}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Mantenimiento programado..."
                />
              </div>
              <div>
                <Label>Mensaje *</Label>
                <Textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Detalle del mensaje..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filtrar por planes (opcional, separados por coma)</Label>
                <Input
                  value={form.target_plans}
                  onChange={e => setForm(f => ({ ...f, target_plans: e.target.value }))}
                  placeholder="basico, profesional, enterprise"
                />
              </div>
              <div>
                <Label>Filtrar por estados (opcional, separados por coma)</Label>
                <Input
                  value={form.target_statuses}
                  onChange={e => setForm(f => ({ ...f, target_statuses: e.target.value }))}
                  placeholder="activa, trial"
                />
              </div>
              <div>
                <Label>Fecha de expiración (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Notificación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones Enviadas ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay notificaciones</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Lecturas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map(n => {
                  const pc = priorityConfig[n.priority as keyof typeof priorityConfig] || priorityConfig.info;
                  const Icon = pc.icon;
                  return (
                    <TableRow key={n.id}>
                      <TableCell>
                        <Badge className={pc.color}>
                          <Icon className="h-3 w-3 mr-1" />{pc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{n.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {n.target_plans?.length ? n.target_plans.join(', ') : 'Todos los planes'}
                        {' · '}
                        {n.target_statuses?.length ? n.target_statuses.join(', ') : 'Todos los estados'}
                      </TableCell>
                      <TableCell>{readCounts[n.id] || 0}</TableCell>
                      <TableCell>
                        {isExpired(n) ? (
                          <Badge variant="secondary">Expirada</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-300">Activa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString('es-CO')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(n.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationsPage;
