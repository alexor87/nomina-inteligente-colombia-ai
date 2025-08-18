
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface EconomicIdentificationSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const EconomicIdentificationSection = ({ companyData, onInputChange }: EconomicIdentificationSectionProps) => {
  // Define risk class options with guaranteed non-empty values
  const riskClassOptions = [
    { value: 'I', label: 'Clase I - Riesgo Mínimo' },
    { value: 'II', label: 'Clase II - Riesgo Bajo' },
    { value: 'III', label: 'Clase III - Riesgo Medio' },
    { value: 'IV', label: 'Clase IV - Riesgo Alto' },
    { value: 'V', label: 'Clase V - Riesgo Máximo' }
  ];

  // Define company size options with guaranteed non-empty values
  const companySizeOptions = [
    { value: 'micro', label: 'Microempresa (1-10 empleados)' },
    { value: 'pequena', label: 'Pequeña empresa (11-50 empleados)' },
    { value: 'mediana', label: 'Mediana empresa (51-200 empleados)' },
    { value: 'grande', label: 'Gran empresa (200+ empleados)' }
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        🏢 Identificación Económica
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="codigo_ciiu">Código CIIU</Label>
          <div className="flex gap-2">
            <Input
              id="codigo_ciiu"
              value={companyData.codigo_ciiu}
              onChange={(e) => onInputChange('codigo_ciiu', e.target.value)}
              placeholder="1234"
            />
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400 mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Clasificación Industrial Internacional Uniforme</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div>
          <Label htmlFor="nombre_ciiu">Actividad económica (CIIU)</Label>
          <Input
            id="nombre_ciiu"
            value={companyData.nombre_ciiu}
            onChange={(e) => onInputChange('nombre_ciiu', e.target.value)}
            placeholder="Descripción de la actividad"
          />
        </div>

        <div>
          <Label htmlFor="clase_riesgo_arl">Clase de riesgo ARL</Label>
          <Select value={companyData.clase_riesgo_arl} onValueChange={(value) => onInputChange('clase_riesgo_arl', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione clase" />
            </SelectTrigger>
            <SelectContent>
              {riskClassOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tamano_empresa">Tamaño de empresa</Label>
          <Select value={companyData.tamano_empresa} onValueChange={(value) => onInputChange('tamano_empresa', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione tamaño" />
            </SelectTrigger>
            <SelectContent>
              {companySizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
