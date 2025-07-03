
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, X } from 'lucide-react';
import { useCompanyRegistrationStore } from '../hooks/useCompanyRegistrationStore';
import { calculateVerificationDigit } from '../utils/digitVerification';
import { industryCategories } from '../utils/industryData';

interface CompanyDataStepProps {
  onNext: () => void;
  onCancel?: () => void;
}

export const CompanyDataStep = ({ onNext, onCancel }: CompanyDataStepProps) => {
  const { data, updateData } = useCompanyRegistrationStore();
  const [formData, setFormData] = useState({
    identificationType: data.identificationType || 'NIT',
    identificationNumber: data.identificationNumber || '',
    verificationDigit: data.verificationDigit || '',
    razonSocial: data.razonSocial || '',
    telefono: data.telefono || '',
    direccion: data.direccion || '',
    industry: data.industry || '',
    ciiuCode: data.ciiuCode || '',
    employeeCount: data.employeeCount || '',
    payrollFrequency: data.payrollFrequency || 'mensual',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData.identificationNumber && formData.identificationType === 'NIT') {
      const dv = calculateVerificationDigit(formData.identificationNumber);
      setFormData(prev => ({ ...prev, verificationDigit: dv }));
    }
  }, [formData.identificationNumber, formData.identificationType]);

  const employeeRanges = [
    { value: '1-19', label: '1-19 empleados' },
    { value: '20-49', label: '20-49 empleados' },
    { value: '50-99', label: '50-99 empleados' },
    { value: '100-249', label: '100-249 empleados' },
    { value: '250+', label: '250+ empleados' },
  ];

  const handleIndustrySelect = (industry: string) => {
    const selectedIndustry = industryCategories.find(cat => cat.name === industry);
    setFormData(prev => ({
      ...prev,
      industry,
      ciiuCode: selectedIndustry?.ciiuCode || ''
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.identificationNumber) {
      newErrors.identificationNumber = 'Número de identificación es requerido';
    }

    if (!formData.razonSocial) {
      newErrors.razonSocial = 'Razón social es requerida';
    }

    if (!formData.industry) {
      newErrors.industry = 'Industria es requerida';
    }

    if (!formData.employeeCount) {
      newErrors.employeeCount = 'Número de empleados es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      updateData(formData);
      onNext();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-4 animate-slide-in-right relative">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}
      <CardHeader>
        <div className="flex items-center">
          <Building2 className="h-6 w-6 text-blue-600 mr-2" />
          <CardTitle>Información de tu empresa</CardTitle>
        </div>
        <p className="text-gray-600">
          Cuéntanos sobre tu empresa para configurar la nómina correctamente
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="identificationType">Tipo de identificación</Label>
            <Select 
              value={formData.identificationType} 
              onValueChange={(value: 'NIT' | 'CC' | 'CE') => 
                setFormData(prev => ({ ...prev, identificationType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NIT">NIT</SelectItem>
                <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                <SelectItem value="CE">Cédula de Extranjería</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="identificationNumber">Número de identificación *</Label>
            <Input
              id="identificationNumber"
              value={formData.identificationNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, identificationNumber: e.target.value }))}
              placeholder="123456789"
              className={errors.identificationNumber ? 'border-red-500' : ''}
            />
            {errors.identificationNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.identificationNumber}</p>
            )}
          </div>

          {formData.identificationType === 'NIT' && (
            <div>
              <Label htmlFor="verificationDigit">Dígito de verificación</Label>
              <Input
                id="verificationDigit"
                value={formData.verificationDigit}
                readOnly
                className="bg-gray-50"
              />
            </div>
          )}
        </div>

        {/* Company basic info */}
        <div>
          <Label htmlFor="razonSocial">Razón Social / Nombre de la empresa *</Label>
          <Input
            id="razonSocial"
            value={formData.razonSocial}
            onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
            placeholder="Nombre completo de tu empresa"
            className={errors.razonSocial ? 'border-red-500' : ''}
          />
          {errors.razonSocial && (
            <p className="text-red-500 text-sm mt-1">{errors.razonSocial}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="Teléfono de la empresa"
            />
          </div>

          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
              placeholder="Dirección de la empresa"
            />
          </div>
        </div>

        {/* Industry */}
        <div>
          <Label>Industria *</Label>
          <Select value={formData.industry} onValueChange={handleIndustrySelect}>
            <SelectTrigger className={errors.industry ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecciona tu industria" />
            </SelectTrigger>
            <SelectContent>
              {industryCategories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.ciiuCode && (
            <p className="text-sm text-gray-600 mt-1">
              Código CIIU: {formData.ciiuCode}
            </p>
          )}
          {errors.industry && (
            <p className="text-red-500 text-sm mt-1">{errors.industry}</p>
          )}
        </div>

        {/* Employee Count */}
        <div>
          <Label>Número de empleados *</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {employeeRanges.map((range) => (
              <Badge
                key={range.value}
                variant={formData.employeeCount === range.value ? "default" : "outline"}
                className="cursor-pointer px-3 py-2"
                onClick={() => setFormData(prev => ({ ...prev, employeeCount: range.value }))}
              >
                {range.label}
              </Badge>
            ))}
          </div>
          {errors.employeeCount && (
            <p className="text-red-500 text-sm mt-1">{errors.employeeCount}</p>
          )}
        </div>

        {/* Payroll Frequency */}
        <div>
          <Label>Frecuencia de nómina</Label>
          <div className="flex gap-2 mt-2">
            <Badge
              variant={formData.payrollFrequency === 'quincenal' ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setFormData(prev => ({ ...prev, payrollFrequency: 'quincenal' }))}
            >
              Quincenal
            </Badge>
            <Badge
              variant={formData.payrollFrequency === 'mensual' ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setFormData(prev => ({ ...prev, payrollFrequency: 'mensual' }))}
            >
              Mensual
            </Badge>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button 
              onClick={onCancel}
              variant="outline"
              className="px-8"
            >
              Cancelar
            </Button>
          )}
          <Button onClick={handleContinue} className="px-8">
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
