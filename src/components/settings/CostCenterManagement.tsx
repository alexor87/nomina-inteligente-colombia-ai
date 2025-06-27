
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';
import { CostCenterService } from '@/services/CostCenterService';
import { CostCenter, CostCenterFormData } from '@/types/cost-centers';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const CostCenterManagement = () => {
  const { toast } = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState<CostCenterFormData>({
    code: '',
    name: '',
    description: ''
  });

  const loadCostCenters = async () => {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        const centers = await CostCenterService.getCostCenters(companyId);
        setCostCenters(centers);
      }
    } catch (error) {
      console.error('Error loading cost centers:', error);
    }
  };

  useEffect(() => {
    loadCostCenters();
  }, []);

  const handleInputChange = (field: keyof CostCenterFormData, value: string) => {
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

      if (editingCostCenter) {
        await CostCenterService.updateCostCenter(editingCostCenter.id, formData);
        toast({
          title: "✅ Centro de costo actualizado",
          description: "Los cambios se han guardado exitosamente"
        });
      } else {
        await CostCenterService.createCostCenter(companyId, formData);
        toast({
          title: "✅ Centro de costo creado",
          description: "El centro de costo se ha creado exitosamente"
        });
      }

      setIsDialogOpen(false);
      setEditingCostCenter(null);
      setFormData({ code: '', name: '', description: '' });
      loadCostCenters();
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo guardar el centro de costo",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este centro de costo?')) {
      const success = await CostCenterService.deleteCostCenter(id);
      if (success) {
        toast({
          title: "✅ Centro de costo eliminado",
          description: "El centro de costo se ha eliminado exitosamente"
        });
        loadCostCenters();
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudo eliminar el centro de costo",
          variant: "destructive"
        });
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCostCenter(null);
    setFormData({ code: '', name: '', description: '' });
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">💼 Centros de Costo</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Centro de Costo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCostCenter ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="CC001"
                />
              </div>
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Administración"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción del centro de costo"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingCostCenter ? 'Actualizar' : 'Crear'}
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
            <TableHead>Descripción</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costCenters.map((center) => (
            <TableRow key={center.id}>
              <TableCell className="font-medium">{center.code}</TableCell>
              <TableCell>{center.name}</TableCell>
              <TableCell>{center.description || '-'}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(center)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(center.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {costCenters.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500">
                No hay centros de costo registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
