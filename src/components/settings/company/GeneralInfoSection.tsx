
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';

interface GeneralInfoSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const GeneralInfoSection = ({ companyData, onInputChange }: GeneralInfoSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        🧩 Información General de la Empresa
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="razon_social">Nombre Legal de la Empresa *</Label>
          <Input
            id="razon_social"
            value={companyData.razon_social}
            onChange={(e) => onInputChange('razon_social', e.target.value)}
            placeholder="Razón social de la empresa"
            required
          />
        </div>

        <div>
          <Label htmlFor="tipo_sociedad">Tipo de Sociedad</Label>
          <Select value={companyData.tipo_sociedad} onValueChange={(value) => onInputChange('tipo_sociedad', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAS">S.A.S - Sociedad por Acciones Simplificada</SelectItem>
              <SelectItem value="SA">S.A. - Sociedad Anónima</SelectItem>
              <SelectItem value="LTDA">Ltda. - Sociedad Limitada</SelectItem>
              <SelectItem value="EU">E.U. - Empresa Unipersonal</SelectItem>
              <SelectItem value="COOPERATIVA">Cooperativa</SelectItem>
              <SelectItem value="FUNDACION">Fundación</SelectItem>
              <SelectItem value="CORPORACION">Corporación</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="nit">NIT / Número de Identificación *</Label>
          <Input
            id="nit"
            value={companyData.nit}
            onChange={(e) => onInputChange('nit', e.target.value)}
            placeholder="123456789"
            required
          />
        </div>

        <div>
          <Label htmlFor="dv">DV (Dígito de Verificación)</Label>
          <Input
            id="dv"
            value={companyData.dv}
            onChange={(e) => onInputChange('dv', e.target.value)}
            placeholder="1"
            maxLength={1}
          />
        </div>

        <div>
          <Label htmlFor="email">Correo de contacto principal *</Label>
          <Input
            id="email"
            type="email"
            value={companyData.email}
            onChange={(e) => onInputChange('email', e.target.value)}
            placeholder="contacto@empresa.com"
            required
          />
        </div>

        <div>
          <Label htmlFor="telefono">Teléfono de contacto</Label>
          <Input
            id="telefono"
            value={companyData.telefono}
            onChange={(e) => onInputChange('telefono', e.target.value)}
            placeholder="+57 300 123 4567"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="logo_url">Logo de la empresa</Label>
          <div className="flex gap-2">
            <Input
              id="logo_url"
              value={companyData.logo_url}
              onChange={(e) => onInputChange('logo_url', e.target.value)}
              placeholder="URL del logo o subir archivo"
            />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
