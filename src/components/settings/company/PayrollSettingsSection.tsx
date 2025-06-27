
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface PayrollSettingsSectionProps {
  companyData: any;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const PayrollSettingsSection = ({ companyData, onInputChange }: PayrollSettingsSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        ⚙️ Configuraciones de Nómina
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="periodicidad">Periodicidad de nómina *</Label>
          <Select value={companyData.periodicidad} onValueChange={(value) => onInputChange('periodicidad', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione periodicidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="fecha_inicio_operacion">Fecha de inicio de operación</Label>
          <Input
            id="fecha_inicio_operacion"
            type="date"
            value={companyData.fecha_inicio_operacion}
            onChange={(e) => onInputChange('fecha_inicio_operacion', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="ultima_liquidacion">Última fecha de liquidación</Label>
          <Input
            id="ultima_liquidacion"
            type="date"
            value={companyData.ultima_liquidacion}
            disabled
            className="bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">Solo lectura - Se actualiza automáticamente</p>
        </div>

        <div>
          <Label htmlFor="calculo_horas_extra">Tipo de cálculo de horas extras</Label>
          <Select value={companyData.calculo_horas_extra} onValueChange={(value) => onInputChange('calculo_horas_extra', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="automatico">Automático</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="nomina_prueba"
              checked={companyData.nomina_prueba}
              onCheckedChange={(checked) => onInputChange('nomina_prueba', checked as boolean)}
            />
            <Label htmlFor="nomina_prueba">¿Habilitar nómina de prueba?</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Permite realizar liquidaciones de prueba sin afectar los datos reales</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </Card>
  );
};
