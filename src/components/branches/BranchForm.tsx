
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useColombianGeography } from '@/hooks/useColombianGeography';
import { BranchFormData } from '@/types/branches';

interface BranchFormProps {
  initialData?: Partial<BranchFormData>;
  onSubmit: (data: BranchFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const BranchForm = ({ initialData, onSubmit, onCancel, isLoading }: BranchFormProps) => {
  const { 
    departments, 
    municipalities, 
    selectedDepartment, 
    setSelectedDepartment 
  } = useColombianGeography();

  const [formData, setFormData] = useState<BranchFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    department: initialData?.department || '',
    phone: initialData?.phone || '',
    manager_name: initialData?.manager_name || ''
  });

  // Set the selected department when component loads or when initialData changes
  useEffect(() => {
    if (initialData?.department && initialData.department !== selectedDepartment) {
      setSelectedDepartment(initialData.department);
    }
  }, [initialData?.department, selectedDepartment, setSelectedDepartment]);

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
    setFormData(prev => ({
      ...prev,
      department: value,
      city: '' // Reset city when department changes
    }));
  };

  const handleCityChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      city: value
    }));
  };

  const handleInputChange = (field: keyof BranchFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Filter out empty values from departments and municipalities
  const validDepartments = departments.filter(dept => dept.value && dept.value.trim() !== '');
  const validMunicipalities = municipalities.filter(muni => muni.value && muni.value.trim() !== '');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Código *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value)}
            placeholder="Ej: SUC001"
            required
          />
        </div>

        <div>
          <Label htmlFor="name">Nombre de la sucursal *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ej: Sucursal Norte"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Calle 123 # 45-67"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">Departamento</Label>
          <Select value={formData.department} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="bg-white border border-gray-300 z-50">
              <SelectValue placeholder="Seleccione departamento" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 z-50 max-h-60 overflow-y-auto">
              {validDepartments.map((departamento) => (
                <SelectItem key={departamento.value} value={departamento.value}>
                  {departamento.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="city">Ciudad / Municipio</Label>
          <Select 
            value={formData.city} 
            onValueChange={handleCityChange}
            disabled={!selectedDepartment || validMunicipalities.length === 0}
          >
            <SelectTrigger className="bg-white border border-gray-300 z-40">
              <SelectValue placeholder={
                !selectedDepartment 
                  ? "Primero seleccione un departamento" 
                  : "Seleccione ciudad/municipio"
              } />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 z-40 max-h-60 overflow-y-auto">
              {validMunicipalities.map((ciudad) => (
                <SelectItem key={ciudad.value} value={ciudad.value}>
                  {ciudad.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="manager_name">Nombre del encargado</Label>
          <Input
            id="manager_name"
            value={formData.manager_name}
            onChange={(e) => handleInputChange('manager_name', e.target.value)}
            placeholder="Nombre completo"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
};
