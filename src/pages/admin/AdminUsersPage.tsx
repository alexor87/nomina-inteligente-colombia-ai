import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SuperAdminService } from '@/services/SuperAdminService';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Search, Shield, ShieldOff, UserPlus } from 'lucide-react';

const ASSIGNABLE_ROLES = [
  { value: 'superadmin', label: 'SuperAdmin' },
  { value: 'soporte', label: 'Soporte' },
];

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [selectedRole, setSelectedRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-platform-users'],
    queryFn: () => SuperAdminService.getAllPlatformUsers()
  });

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (u.company_name || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' ||
      u.roles.some((r: any) => r.role === roleFilter);
    return matchSearch && matchRole;
  });

  const handleAssignRole = async () => {
    if (!assignDialog.user || !selectedRole) return;
    setIsSubmitting(true);
    try {
      await SuperAdminService.assignRole(assignDialog.user.user_id, selectedRole);
      toast({ title: 'Rol asignado', description: `${selectedRole} asignado a ${assignDialog.user.first_name}` });
      queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] });
      setAssignDialog({ open: false, user: null });
      setSelectedRole('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeRole = async (userId: string, role: string, userName: string) => {
    if (!confirm(`¿Revocar rol "${role}" de ${userName}?`)) return;
    try {
      await SuperAdminService.revokeRole(userId, role);
      toast({ title: 'Rol revocado', description: `${role} revocado de ${userName}` });
      queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin': return <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">SuperAdmin</Badge>;
      case 'soporte': return <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Soporte</Badge>;
      case 'administrador': return <Badge variant="outline" className="text-xs">Admin</Badge>;
      default: return <Badge variant="secondary" className="text-xs capitalize">{role}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} usuarios registrados</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o empresa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="superadmin">SuperAdmin</SelectItem>
            <SelectItem value="soporte">Soporte</SelectItem>
            <SelectItem value="administrador">Administrador</SelectItem>
            <SelectItem value="rrhh">RRHH</SelectItem>
            <SelectItem value="contador">Contador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Usuario</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Empresa</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Roles</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div>
                          <span className="font-medium text-foreground">{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{u.company_name || '—'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length > 0 ? u.roles.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              {getRoleBadge(r.role)}
                              {(r.role === 'superadmin' || r.role === 'soporte') && (
                                <button
                                  onClick={() => handleRevokeRole(u.user_id, r.role, `${u.first_name} ${u.last_name}`)}
                                  className="text-destructive hover:text-destructive/80 transition-colors"
                                  title="Revocar rol"
                                >
                                  <ShieldOff className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )) : <span className="text-muted-foreground text-xs">Sin roles</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setAssignDialog({ open: true, user: u }); setSelectedRole(''); }}
                          title="Asignar rol"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No se encontraron usuarios</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialog.open} onOpenChange={open => !open && setAssignDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Rol — {assignDialog.user?.first_name} {assignDialog.user?.last_name}</DialogTitle>
            <DialogDescription>Selecciona un rol de plataforma para asignar a este usuario.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue placeholder="Selecciona un rol..." /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, user: null })}>Cancelar</Button>
            <Button onClick={handleAssignRole} disabled={!selectedRole || isSubmitting}>
              {isSubmitting ? 'Asignando...' : 'Asignar Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
