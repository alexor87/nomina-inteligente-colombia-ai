
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Eye } from 'lucide-react';
import { useRef, useState } from 'react';
import { useLogoUpload } from '@/hooks/useLogoUpload';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';

interface GeneralInfoSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const GeneralInfoSection = ({ companyData, onInputChange }: GeneralInfoSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { uploadLogo, uploading } = useLogoUpload();
  const { companyDetails } = useCompanyDetails();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyDetails?.id) return;

    const logoUrl = await uploadLogo(file, companyDetails.id);
    if (logoUrl) {
      onInputChange('logo_url', logoUrl);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    onInputChange('logo_url', '');
  };
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
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                id="logo_url"
                value={companyData.logo_url || ''}
                onChange={(e) => onInputChange('logo_url', e.target.value)}
                placeholder="URL del logo"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUploadClick}
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Subiendo...' : 'Subir'}
              </Button>
              {companyData.logo_url && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            
            {/* Logo Preview */}
            {companyData.logo_url && showPreview && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Vista previa del logo:</p>
                <img
                  src={companyData.logo_url}
                  alt="Logo de la empresa"
                  className="max-h-24 max-w-48 object-contain"
                  onError={(e) => {
                    console.error('Error loading logo image');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
