
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useColombianGeography } from '@/hooks/useColombianGeography';
import { useEffect } from 'react';

interface AddressSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const AddressSection = ({ companyData, onInputChange }: AddressSectionProps) => {
  const { 
    departments, 
    municipalities, 
    selectedDepartment, 
    setSelectedDepartment 
  } = useColombianGeography();

  // Set the selected department when component loads or when companyData.departamento changes
  useEffect(() => {
    if (companyData.departamento && companyData.departamento !== selectedDepartment) {
      setSelectedDepartment(companyData.departamento);
    }
  }, [companyData.departamento, selectedDepartment, setSelectedDepartment]);

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
    onInputChange('departamento', value);
    // Reset city when department changes
    if (companyData.ciudad) {
      onInputChange('ciudad', '');
    }
  };

  const handleCityChange = (value: string) => {
    onInputChange('ciudad', value);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        📍 Dirección y Ubicación
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Label htmlFor="direccion">Dirección principal *</Label>
          <Input
            id="direccion"
            value={companyData.direccion}
            onChange={(e) => onInputChange('direccion', e.target.value)}
            placeholder="Calle 123 # 45-67"
            required
          />
        </div>

        <div>
          <Label htmlFor="departamento">Departamento *</Label>
          <Select value={companyData.departamento} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="bg-white border border-gray-300 z-50">
              <SelectValue placeholder="Seleccione departamento" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 z-50 max-h-60 overflow-y-auto">
              {departments.map((departamento) => (
                <SelectItem key={departamento.value} value={departamento.value}>
                  {departamento.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="ciudad">Ciudad / Municipio *</Label>
          <Select 
            value={companyData.ciudad} 
            onValueChange={handleCityChange}
            disabled={!selectedDepartment || municipalities.length === 0}
          >
            <SelectTrigger className="bg-white border border-gray-300 z-40">
              <SelectValue placeholder={
                !selectedDepartment 
                  ? "Primero seleccione un departamento" 
                  : "Seleccione ciudad/municipio"
              } />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 z-40 max-h-60 overflow-y-auto">
              {municipalities.map((ciudad) => (
                <SelectItem key={ciudad.value} value={ciudad.value}>
                  {ciudad.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="codigo_postal">Código Postal</Label>
          <Input
            id="codigo_postal"
            value={companyData.codigo_postal}
            onChange={(e) => onInputChange('codigo_postal', e.target.value)}
            placeholder="110111"
          />
        </div>

        <div>
          <Label htmlFor="pais">País</Label>
          <Input
            id="pais"
            value={companyData.pais}
            onChange={(e) => onInputChange('pais', e.target.value)}
            placeholder="Colombia"
            disabled
          />
        </div>
      </div>
    </Card>
  );
};
