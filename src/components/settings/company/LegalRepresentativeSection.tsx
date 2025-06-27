
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LegalRepresentativeSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const LegalRepresentativeSection = ({ companyData, onInputChange }: LegalRepresentativeSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        👤 Representante Legal
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="representante_legal">Nombre completo</Label>
          <Input
            id="representante_legal"
            value={companyData.representante_legal}
            onChange={(e) => onInputChange('representante_legal', e.target.value)}
            placeholder="Nombre del representante legal"
          />
        </div>

        <div>
          <Label htmlFor="representante_tipo_doc">Tipo de documento</Label>
          <Select value={companyData.representante_tipo_doc} onValueChange={(value) => onInputChange('representante_tipo_doc', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
              <SelectItem value="PA">Pasaporte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="representante_documento">Número de documento</Label>
          <Input
            id="representante_documento"
            value={companyData.representante_documento}
            onChange={(e) => onInputChange('representante_documento', e.target.value)}
            placeholder="12345678"
          />
        </div>

        <div>
          <Label htmlFor="representante_email">Correo del representante legal</Label>
          <Input
            id="representante_email"
            type="email"
            value={companyData.representante_email}
            onChange={(e) => onInputChange('representante_email', e.target.value)}
            placeholder="representante@empresa.com"
          />
        </div>
      </div>
    </Card>
  );
};
