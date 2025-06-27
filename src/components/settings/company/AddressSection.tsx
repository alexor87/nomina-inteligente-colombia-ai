
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddressSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const AddressSection = ({ companyData, onInputChange }: AddressSectionProps) => {
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
          <Label htmlFor="ciudad">Ciudad / Municipio *</Label>
          <Input
            id="ciudad"
            value={companyData.ciudad}
            onChange={(e) => onInputChange('ciudad', e.target.value)}
            placeholder="Bogotá"
            required
          />
        </div>

        <div>
          <Label htmlFor="departamento">Departamento *</Label>
          <Select value={companyData.departamento} onValueChange={(value) => onInputChange('departamento', value)}>
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
