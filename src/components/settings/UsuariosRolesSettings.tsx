import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyName } from '@/hooks/useCompanyName';
import { TeamInvitationService, TeamInvitation } from '@/services/TeamInvitationService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, User, UserX, Mail, AlertCircle } from 'lucide-react';

interface Usuario {
  id: string;
  nombreCompleto: string;
  email: string;
  rol: string;
  estado: 'Activo' | 'Invitación pendiente' | 'Suspendido';
  ultimoAcceso: string;
  fechaInvitacion?: string;
  fechaRegistro?: string;
}

interface ActividadAuditoria {
  id: string;
  usuario: string;
  accion: string;
  fecha: string;
  resultado: 'Éxito' | 'Error';
  detalles?: string;
}

interface FormularioInvitacion {
  email: string;
  rol: string;
  nombreCompleto: string;
}

interface EditarUsuario {
  id: string;
  nombreCompleto: string;
  rol: string;
  estado: Usuario['estado'];
}

const rolesDisponibles = [
  { 
    value: 'administrador', 
    label: 'Administrador', 
    descripcion: 'Acceso total a todas las secciones y configuraciones',
    permisos: ['crear', 'editar', 'eliminar', 'configurar', 'invitar']
  },
  { 
    value: 'rrhh', 
    label: 'RRHH', 
    descripcion: 'Gestión de empleados, contratos, novedades, vacaciones',
    permisos: ['empleados', 'contratos', 'novedades', 'vacaciones']
  },
  { 
    value: 'contador', 
    label: 'Contador', 
    descripcion: 'Revisión de nómina, generación de reportes y archivos',
    permisos: ['nomina', 'reportes', 'archivos']
  },
  { 
    value: 'visualizador', 
    label: 'Visualizador', 
    descripcion: 'Solo lectura (empleados, reportes, configuración)',
    permisos: ['lectura']
  },
  { 
    value: 'soporte', 
    label: 'Soporte externo', 
    descripcion: 'Acceso limitado y temporal, sin ver datos personales',
    permisos: ['soporte']
  }
];

const AUDIT_KEY = 'empresa_auditoria';

export const UsuariosRolesSettings = () => {
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const { companyName } = useCompanyName();
  
  // Estados principales
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [historialAuditoria, setHistorialAuditoria] = useState<ActividadAuditoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de modales
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<EditarUsuario | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Estados de formularios
  const [inviteForm, setInviteForm] = useState<FormularioInvitacion>({
    email: '',
    rol: '',
    nombreCompleto: ''
  });
  
  // Estados de validación
  const [erroresValidacion, setErroresValidacion] = useState<Record<string, string>>({});

  // Función para obtener el usuario actual
  const getCurrentUserEmail = () => user?.email || '';
  const getCurrentUserName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return getCurrentUserEmail();
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    if (!authLoading) {
      cargarDatos();
    }
  }, [authLoading]);

  const cargarDatos = async () => {
    try {
      const currentUserEmail = getCurrentUserEmail();
      const currentUserName = getCurrentUserName();

      // Always show the current user as active admin
      const usuariosBase: Usuario[] = currentUserEmail
        ? [{
            id: user?.id || '1',
            nombreCompleto: currentUserName,
            email: currentUserEmail,
            rol: 'administrador',
            estado: 'Activo',
            ultimoAcceso: new Date().toISOString().split('T')[0],
            fechaRegistro: new Date().toISOString().split('T')[0]
          }]
        : [];

      // Load real invitations from Supabase
      if (profile?.company_id) {
        const invitations = await TeamInvitationService.getCompanyInvitations(profile.company_id);
        setPendingInvitations(invitations);

        const invitedUsers: Usuario[] = invitations.map((inv) => ({
          id: inv.id,
          nombreCompleto: inv.invited_name || 'Nombre pendiente',
          email: inv.invited_email,
          rol: inv.role,
          estado: inv.status === 'accepted' ? 'Activo' : inv.status === 'pending' ? 'Invitación pendiente' : 'Suspendido',
          ultimoAcceso: inv.status === 'accepted' ? inv.created_at.split('T')[0] : 'N/A',
          fechaInvitacion: inv.created_at.split('T')[0],
        }));

        const currentUserInInvitations = invitedUsers.some(u => u.email === currentUserEmail);
        setUsuarios([...(currentUserInInvitations ? [] : usuariosBase), ...invitedUsers]);
      } else {
        setUsuarios(usuariosBase);
      }

      // Load audit log
      const auditoriaGuardada = localStorage.getItem(AUDIT_KEY);
      if (auditoriaGuardada) {
        setHistorialAuditoria(JSON.parse(auditoriaGuardada));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de usuarios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const guardarUsuarios = (nuevosUsuarios: Usuario[]) => {
    setUsuarios(nuevosUsuarios);
  };

  const agregarActividad = (actividad: Omit<ActividadAuditoria, 'id' | 'fecha'>) => {
    try {
      const nuevaActividad: ActividadAuditoria = {
        ...actividad,
        id: Date.now().toString(),
        fecha: new Date().toLocaleString('es-ES'),
        usuario: actividad.usuario || getCurrentUserEmail() // Usar usuario actual si no se especifica
      };
      
      const nuevaAuditoria = [nuevaActividad, ...historialAuditoria].slice(0, 100); // Mantener últimas 100
      setHistorialAuditoria(nuevaAuditoria);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(nuevaAuditoria));
    } catch (error) {
      console.error('Error guardando actividad:', error);
    }
  };

  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validarFormularioInvitacion = (): boolean => {
    const errores: Record<string, string> = {};

    if (!inviteForm.email.trim()) {
      errores.email = 'El correo electrónico es obligatorio';
    } else if (!validarEmail(inviteForm.email)) {
      errores.email = 'Ingrese un correo electrónico válido';
    } else if (usuarios.some(u => u.email.toLowerCase() === inviteForm.email.toLowerCase())) {
      errores.email = 'Ya existe un usuario con este correo electrónico';
    }

    if (!inviteForm.rol) {
      errores.rol = 'Debe seleccionar un rol';
    }

    setErroresValidacion(errores);
    return Object.keys(errores).length === 0;
  };

  const handleInviteUser = async () => {
    if (!validarFormularioInvitacion()) return;
    if (!profile?.company_id || !user) {
      toast({ title: "Error", description: "No se pudo identificar tu empresa", variant: "destructive" });
      return;
    }

    try {
      await TeamInvitationService.createInvitation(
        profile.company_id,
        companyName || 'Tu empresa',
        user.id,
        {
          email: inviteForm.email.toLowerCase().trim(),
          name: inviteForm.nombreCompleto.trim(),
          role: inviteForm.rol,
        }
      );

      agregarActividad({
        usuario: getCurrentUserEmail(),
        accion: `Invitó a nuevo usuario: ${inviteForm.email}`,
        resultado: 'Éxito',
        detalles: `Rol asignado: ${getRolLabel(inviteForm.rol)}`
      });

      setInviteForm({ email: '', rol: '', nombreCompleto: '' });
      setErroresValidacion({});
      setIsInviteModalOpen(false);

      toast({
        title: "Invitación enviada",
        description: `Se ha enviado una invitación a ${inviteForm.email}`,
      });

      // Reload to show new invitation
      await cargarDatos();
    } catch (error) {
      console.error('Error invitando usuario:', error);
      toast({ title: "Error", description: "No se pudo enviar la invitación", variant: "destructive" });
    }
  };

  const cambiarEstadoUsuario = (id: string, nuevoEstado: Usuario['estado']) => {
    const usuariosActualizados = usuarios.map(usuario => {
      if (usuario.id === id) {
        return { 
          ...usuario, 
          estado: nuevoEstado,
          ultimoAcceso: nuevoEstado === 'Activo' ? new Date().toISOString().split('T')[0] : usuario.ultimoAcceso
        };
      }
      return usuario;
    });

    guardarUsuarios(usuariosActualizados);

    const usuario = usuarios.find(u => u.id === id);
    if (usuario) {
      const accion = nuevoEstado === 'Suspendido' ? 'suspendió' : 'activó';
      agregarActividad({
        usuario: getCurrentUserEmail(),
        accion: `${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario: ${usuario.email}`,
        resultado: 'Éxito'
      });
    }

    toast({
      title: "Estado actualizado",
      description: `El usuario ha sido ${nuevoEstado.toLowerCase()}`,
    });
  };

  const eliminarUsuario = (id: string) => {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;

    // No permitir eliminar el último administrador
    const administradores = usuarios.filter(u => u.rol === 'administrador' && u.id !== id);
    if (usuario.rol === 'administrador' && administradores.length === 0) {
      toast({
        title: "No se puede eliminar",
        description: "Debe existir al menos un administrador en el sistema",
        variant: "destructive"
      });
      return;
    }

    const usuariosActualizados = usuarios.filter(u => u.id !== id);
    guardarUsuarios(usuariosActualizados);

    agregarActividad({
      usuario: getCurrentUserEmail(),
      accion: `Eliminó usuario: ${usuario.email}`,
      resultado: 'Éxito'
    });

    toast({
      title: "Usuario eliminado",
      description: "El usuario ha sido eliminado del sistema",
    });
  };

  const reenviarInvitacion = async (id: string) => {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario || usuario.estado !== 'Invitación pendiente') return;

    try {
      await TeamInvitationService.resendInvitation(id, companyName || 'Tu empresa');

      agregarActividad({
        usuario: getCurrentUserEmail(),
        accion: `Reenvió invitación a: ${usuario.email}`,
        resultado: 'Éxito'
      });

      toast({
        title: "Invitación reenviada",
        description: `Se ha reenviado la invitación a ${usuario.email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo reenviar la invitación",
        variant: "destructive"
      });
    }
  };

  const abrirModalEdicion = (usuario: Usuario) => {
    setUsuarioEditando({
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      rol: usuario.rol,
      estado: usuario.estado
    });
    setIsEditModalOpen(true);
  };

  const guardarEdicionUsuario = () => {
    if (!usuarioEditando) return;

    const usuariosActualizados = usuarios.map(usuario => 
      usuario.id === usuarioEditando.id 
        ? { 
            ...usuario, 
            nombreCompleto: usuarioEditando.nombreCompleto,
            rol: usuarioEditando.rol,
            estado: usuarioEditando.estado
          }
        : usuario
    );

    guardarUsuarios(usuariosActualizados);

    const usuario = usuarios.find(u => u.id === usuarioEditando.id);
    if (usuario) {
      agregarActividad({
        usuario: getCurrentUserEmail(),
        accion: `Modificó usuario: ${usuario.email}`,
        resultado: 'Éxito',
        detalles: `Nuevo rol: ${getRolLabel(usuarioEditando.rol)}`
      });
    }

    setIsEditModalOpen(false);
    setUsuarioEditando(null);

    toast({
      title: "Usuario actualizado",
      description: "Los cambios han sido guardados correctamente",
    });
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter(usuario => {
    const coincideBusqueda = usuario.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const coincidenRol = filtroRol === 'todos' || usuario.rol === filtroRol;
    const coincidenEstado = filtroEstado === 'todos' || usuario.estado === filtroEstado;
    
    return coincideBusqueda && coincidenRol && coincidenEstado;
  });

  const getEstadoBadge = (estado: Usuario['estado']) => {
    const variants = {
      'Activo': { variant: 'default' as const, icon: User },
      'Invitación pendiente': { variant: 'secondary' as const, icon: Mail },
      'Suspendido': { variant: 'destructive' as const, icon: UserX }
    };

    const config = variants[estado];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {estado}
      </Badge>
    );
  };

  const getRolLabel = (rol: string) => {
    const rolEncontrado = rolesDisponibles.find(r => r.value === rol);
    return rolEncontrado?.label || rol;
  };

  const getRolDescripcion = (rol: string) => {
    const rolEncontrado = rolesDisponibles.find(r => r.value === rol);
    return rolEncontrado?.descripcion || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧑‍💼 Usuarios y Roles</h2>
        <p className="text-gray-600">Gestión de usuarios internos y permisos del sistema</p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usuarios">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="auditoria">Historial de Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium">Usuarios del Sistema</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Invitar nuevo usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Invitar nuevo usuario</DialogTitle>
                    <DialogDescription>
                      Envía una invitación para que un nuevo usuario acceda al sistema.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        value={inviteForm.email}
                        onChange={(e) => {
                          setInviteForm({...inviteForm, email: e.target.value});
                          if (erroresValidacion.email) {
                            setErroresValidacion({...erroresValidacion, email: ''});
                          }
                        }}
                        className={erroresValidacion.email ? 'border-red-500' : ''}
                      />
                      {erroresValidacion.email && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {erroresValidacion.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rol">Rol a asignar *</Label>
                      <Select 
                        value={inviteForm.rol} 
                        onValueChange={(value) => {
                          setInviteForm({...inviteForm, rol: value});
                          if (erroresValidacion.rol) {
                            setErroresValidacion({...erroresValidacion, rol: ''});
                          }
                        }}
                      >
                        <SelectTrigger className={erroresValidacion.rol ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {rolesDisponibles.map((rol) => (
                            <SelectItem key={rol.value} value={rol.value}>
                              <div>
                                <div className="font-medium">{rol.label}</div>
                                <div className="text-xs text-gray-500">{rol.descripcion}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {erroresValidacion.rol && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {erroresValidacion.rol}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo (opcional)</Label>
                      <Input
                        id="nombre"
                        placeholder="Nombre del usuario"
                        value={inviteForm.nombreCompleto}
                        onChange={(e) => setInviteForm({...inviteForm, nombreCompleto: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        Si no se especifica, el usuario podrá completarlo al aceptar la invitación
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleInviteUser}>
                      Enviar invitación
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filtroRol} onValueChange={setFiltroRol}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  {rolesDisponibles.map((rol) => (
                    <SelectItem key={rol.value} value={rol.value}>{rol.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Invitación pendiente">Invitación pendiente</SelectItem>
                  <SelectItem value="Suspendido">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabla de usuarios */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre completo</TableHead>
                    <TableHead>Correo electrónico</TableHead>
                    <TableHead>Rol asignado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchTerm || filtroRol !== 'todos' || filtroEstado !== 'todos' 
                          ? 'No se encontraron usuarios con los filtros aplicados'
                          : 'No hay usuarios registrados'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuariosFiltrados.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nombreCompleto}</TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getRolLabel(usuario.rol)}</div>
                            <div className="text-xs text-gray-500">{getRolDescripcion(usuario.rol)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(usuario.estado)}</TableCell>
                        <TableCell>{usuario.ultimoAcceso}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => abrirModalEdicion(usuario)}
                              title="Editar usuario"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {usuario.estado === 'Invitación pendiente' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => reenviarInvitacion(usuario.id)}
                                title="Reenviar invitación"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => cambiarEstadoUsuario(
                                usuario.id, 
                                usuario.estado === 'Suspendido' ? 'Activo' : 'Suspendido'
                              )}
                              title={usuario.estado === 'Suspendido' ? 'Activar usuario' : 'Suspender usuario'}
                            >
                              {usuario.estado === 'Suspendido' ? <User className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. El usuario {usuario.email} será eliminado permanentemente del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => eliminarUsuario(usuario.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Historial de Actividad</h3>
              <p className="text-sm text-gray-500">
                {historialAuditoria.length} actividad{historialAuditoria.length !== 1 ? 'es' : ''} registrada{historialAuditoria.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción realizada</TableHead>
                    <TableHead>Fecha y hora</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialAuditoria.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No hay actividades registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    historialAuditoria.map((actividad) => (
                      <TableRow key={actividad.id}>
                        <TableCell className="font-medium">{actividad.usuario}</TableCell>
                        <TableCell>
                          <div>
                            <div>{actividad.accion}</div>
                            {actividad.detalles && (
                              <div className="text-xs text-gray-500 mt-1">{actividad.detalles}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{actividad.fecha}</TableCell>
                        <TableCell>
                          <Badge variant={actividad.resultado === 'Éxito' ? 'default' : 'destructive'}>
                            {actividad.resultado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modificar la información del usuario seleccionado.
            </DialogDescription>
          </DialogHeader>
          
          {usuarioEditando && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre completo</Label>
                <Input
                  id="edit-nombre"
                  value={usuarioEditando.nombreCompleto}
                  onChange={(e) => setUsuarioEditando({
                    ...usuarioEditando,
                    nombreCompleto: e.target.value
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-rol">Rol</Label>
                <Select 
                  value={usuarioEditando.rol} 
                  onValueChange={(value) => setUsuarioEditando({
                    ...usuarioEditando,
                    rol: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesDisponibles.map((rol) => (
                      <SelectItem key={rol.value} value={rol.value}>
                        <div>
                          <div className="font-medium">{rol.label}</div>
                          <div className="text-xs text-gray-500">{rol.descripcion}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicionUsuario}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4">
        <Button onClick={() => toast({
          title: "Configuración guardada",
          description: "La configuración de usuarios ha sido actualizada.",
        })} className="bg-blue-600 hover:bg-blue-700">
          Guardar Configuración
        </Button>
        <Button variant="outline" onClick={() => {
          setSearchTerm('');
          setFiltroRol('todos');
          setFiltroEstado('todos');
          toast({
            title: "Filtros restablecidos",
            description: "Se han limpiado todos los filtros aplicados.",
          });
        }}>
          Limpiar Filtros
        </Button>
      </div>
    </div>
  );
};
