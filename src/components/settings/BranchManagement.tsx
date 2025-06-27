
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';
import { BranchService } from '@/services/BranchService';
import { Branch, BranchFormData } from '@/types/branches';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';

export const BranchManagement = () => {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>({
    code: '',
    name: '',
    address: '',
    city: '',
    department: '',
    phone: '',
    manager_name: ''
  });

  const loadBranches = async () => {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        const branchList = await BranchService.getBranches(companyId);
        setBranches(branchList);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleInputChange = (field: keyof BranchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast({
        title: "❌ Error",
        description: "El código y nombre son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) return;

      if (editingBranch) {
        await BranchService.updateBranch(editingBranch.id, formData);
        toast({
          title: "✅ Sucursal actualizada",
          description: "Los cambios se han guardado exitosamente"
        });
      } else {
        await BranchService.createBranch(companyId, formData);
        toast({
          title: "✅ Sucursal creada",
          description: "La sucursal se ha creado exitosamente"
        });
      }

      setIsDialogOpen(false);
      setEditingBranch(null);
      setFormData({ code: '', name: '', address: '', city: '', department: '', phone: '', manager_name: '' });
      loadBranches();
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo guardar la sucursal",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      city: branch.city || '',
      department: branch.department || '',
      phone: branch.phone || '',
      manager_name: branch.manager_name || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar esta sucursal?')) {
      const success = await BranchService.deleteBranch(id);
      if (success) {
        toast({
          title: "✅ Sucursal eliminada",
          description: "La sucursal se ha eliminado exitosamente"
        });
        loadBranches();
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudo eliminar la sucursal",
          variant: "destructive"
        });
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBranch(null);
    setFormData({ code: '', name: '', address: '', city: '', department: '', phone: '', manager_name: '' });
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          🏢 Sucursales / Sedes
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Sucursal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="SUC001"
                />
              </div>
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Sucursal Principal"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Calle 123 # 45-67"
                />
              </div>
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Bogotá"
                />
              </div>
              <div>
                <Label htmlFor="department">Departamento</Label>
                <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cundinamarca">Cundinamarca</SelectItem>
                    <SelectItem value="Antioquia">Antioquia</SelectItem>
                    <SelectItem value="Valle del Cauca">Valle del Cauca</SelectItem>
                    <SelectItem value="Atlántico">Atlántico</SelectItem>
                    <SelectItem value="Santander">Santander</SelectItem>
                    <SelectItem value="Bolívar">Bolívar</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>
              <div>
                <Label htmlFor="manager_name">Responsable / Gerente</Label>
                <Input
                  id="manager_name"
                  value={formData.manager_name}
                  onChange={(e) => handleInputChange('manager_name', e.target.value)}
                  placeholder="Nombre del responsable"
                />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingBranch ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell className="font-medium">{branch.code}</TableCell>
              <TableCell>{branch.name}</TableCell>
              <TableCell>{branch.city || '-'}</TableCell>
              <TableCell>{branch.manager_name || '-'}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(branch)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(branch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {branches.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                No hay sucursales registradas
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
