
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';

interface Usuario {
  id: string;
  nombreCompleto: string;
  email: string;
  rol: string;
  estado: 'Activo' | 'Invitación pendiente' | 'Suspendido';
  ultimoAcceso: string;
}

interface ActividadAuditoria {
  id: string;
  usuario: string;
  accion: string;
  fecha: string;
  resultado: 'Éxito' | 'Error';
}

const rolesDisponibles = [
  { value: 'administrador', label: 'Administrador', descripcion: 'Acceso total a todas las secciones y configuraciones' },
  { value: 'rrhh', label: 'RRHH', descripcion: 'Gestión de empleados, contratos, novedades, vacaciones' },
  { value: 'contador', label: 'Contador', descripcion: 'Revisión de nómina, generación de reportes y archivos' },
  { value: 'visualizador', label: 'Visualizador', descripcion: 'Solo lectura (empleados, reportes, configuración)' },
  { value: 'soporte', label: 'Soporte externo', descripcion: 'Acceso limitado y temporal, sin ver datos personales' }
];

export const UsuariosRolesSettings = () => {
  const { toast } = useToast();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Datos mock de usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    {
      id: '1',
      nombreCompleto: 'Admin Usuario',
      email: 'admin@empresa.com',
      rol: 'administrador',
      estado: 'Activo',
      ultimoAcceso: '2024-01-20'
    },
    {
      id: '2',
      nombreCompleto: 'María González',
      email: 'maria.gonzalez@empresa.com',
      rol: 'rrhh',
      estado: 'Activo',
      ultimoAcceso: '2024-01-19'
    },
    {
      id: '3',
      nombreCompleto: 'Carlos Pérez',
      email: 'carlos.perez@empresa.com',
      rol: 'contador',
      estado: 'Invitación pendiente',
      ultimoAcceso: 'N/A'
    }
  ]);

  // Historial de auditoría mock
  const [historialAuditoria] = useState<ActividadAuditoria[]>([
    {
      id: '1',
      usuario: 'admin@empresa.com',
      accion: 'Invitó a nuevo usuario: carlos.perez@empresa.com',
      fecha: '2024-01-20 10:30',
      resultado: 'Éxito'
    },
    {
      id: '2',
      usuario: 'maria.gonzalez@empresa.com',
      accion: 'Modificó contrato de Juan Pérez',
      fecha: '2024-01-19 14:15',
      resultado: 'Éxito'
    },
    {
      id: '3',
      usuario: 'admin@empresa.com',
      accion: 'Cambió configuración de aportes',
      fecha: '2024-01-18 09:45',
      resultado: 'Error'
    }
  ]);

  // Estados del formulario de invitación
  const [inviteForm, setInviteForm] = useState({
    email: '',
    rol: '',
    nombreCompleto: ''
  });

  const usuariosFiltrados = usuarios.filter(usuario => {
    const coincideBusqueda = usuario.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const coincidenRol = filtroRol === 'todos' || usuario.rol === filtroRol;
    const coincidenEstado = filtroEstado === 'todos' || usuario.estado === filtroEstado;
    
    return coincideBusqueda && coincidenRol && coincidenEstado;
  });

  const handleInviteUser = () => {
    if (!inviteForm.email || !inviteForm.rol) {
      toast({
        title: "Error",
        description: "Email y rol son campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    const nuevoUsuario: Usuario = {
      id: Date.now().toString(),
      nombreCompleto: inviteForm.nombreCompleto || 'Nombre pendiente',
      email: inviteForm.email,
      rol: inviteForm.rol,
      estado: 'Invitación pendiente',
      ultimoAcceso: 'N/A'
    };

    setUsuarios([...usuarios, nuevoUsuario]);
    setInviteForm({ email: '', rol: '', nombreCompleto: '' });
    setIsInviteModalOpen(false);

    toast({
      title: "Invitación enviada",
      description: `Se ha enviado una invitación a ${inviteForm.email}`,
    });
  };

  const suspenderUsuario = (id: string) => {
    setUsuarios(usuarios.map(usuario => 
      usuario.id === id 
        ? { ...usuario, estado: usuario.estado === 'Suspendido' ? 'Activo' : 'Suspendido' as const }
        : usuario
    ));

    toast({
      title: "Estado actualizado",
      description: "El estado del usuario ha sido modificado",
    });
  };

  const eliminarUsuario = (id: string) => {
    setUsuarios(usuarios.filter(usuario => usuario.id !== id));
    toast({
      title: "Usuario eliminado",
      description: "El usuario ha sido eliminado del sistema",
    });
  };

  const getEstadoBadge = (estado: Usuario['estado']) => {
    const variants = {
      'Activo': 'default',
      'Invitación pendiente': 'secondary',
      'Suspendido': 'destructive'
    } as const;

    return <Badge variant={variants[estado]}>{estado}</Badge>;
  };

  const getRolLabel = (rol: string) => {
    const rolEncontrado = rolesDisponibles.find(r => r.value === rol);
    return rolEncontrado?.label || rol;
  };

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "La configuración de usuarios ha sido actualizada.",
    });
  };

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
              <h3 className="text-lg font-medium">Usuarios del Sistema</h3>
              <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Invitar nuevo usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
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
                        onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rol">Rol a asignar *</Label>
                      <Select value={inviteForm.rol} onValueChange={(value) => setInviteForm({...inviteForm, rol: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {rolesDisponibles.map((rol) => (
                            <SelectItem key={rol.value} value={rol.value}>
                              <div>
                                <div className="font-medium">{rol.label}</div>
                                <div className="text-sm text-gray-500">{rol.descripcion}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo (opcional)</Label>
                      <Input
                        id="nombre"
                        placeholder="Nombre del usuario"
                        value={inviteForm.nombreCompleto}
                        onChange={(e) => setInviteForm({...inviteForm, nombreCompleto: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleInviteUser}>
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
                  {usuariosFiltrados.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nombreCompleto}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>{getRolLabel(usuario.rol)}</TableCell>
                      <TableCell>{getEstadoBadge(usuario.estado)}</TableCell>
                      <TableCell>{usuario.ultimoAcceso}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => suspenderUsuario(usuario.id)}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => eliminarUsuario(usuario.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Historial de Actividad</h3>
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
                  {historialAuditoria.map((actividad) => (
                    <TableRow key={actividad.id}>
                      <TableCell className="font-medium">{actividad.usuario}</TableCell>
                      <TableCell>{actividad.accion}</TableCell>
                      <TableCell>{actividad.fecha}</TableCell>
                      <TableCell>
                        <Badge variant={actividad.resultado === 'Éxito' ? 'default' : 'destructive'}>
                          {actividad.resultado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          Guardar Configuración
        </Button>
        <Button variant="outline">
          Revertir Cambios
        </Button>
      </div>
    </div>
  );
};
