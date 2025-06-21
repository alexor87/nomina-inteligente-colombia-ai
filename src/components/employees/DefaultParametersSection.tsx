
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DefaultParameters, CONTRACT_TYPES, ARL_RISK_LEVELS } from '@/types/employee-config';

interface DefaultParametersSectionProps {
  parameters: DefaultParameters;
  onUpdate: (params: Partial<DefaultParameters>) => void;
}

export const DefaultParametersSection = ({ parameters, onUpdate }: DefaultParametersSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">⏱️ Parámetros por Defecto</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="defaultContractType">Tipo de contrato por defecto</Label>
          <Select 
            value={parameters.defaultContractType} 
            onValueChange={(value: any) => onUpdate({ defaultContractType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="standardWorkingHours">Jornada estándar (horas/día)</Label>
          <Input
            id="standardWorkingHours"
            type="number"
            min="1"
            max="12"
            value={parameters.standardWorkingHours}
            onChange={(e) => onUpdate({ standardWorkingHours: parseInt(e.target.value) || 8 })}
          />
        </div>

        <div>
          <Label htmlFor="suggestedPaymentPeriodicity">Periodicidad de pago sugerida</Label>
          <Select 
            value={parameters.suggestedPaymentPeriodicity} 
            onValueChange={(value: any) => onUpdate({ suggestedPaymentPeriodicity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="suggestedCostCenter">Centro de costo sugerido</Label>
          <Input
            id="suggestedCostCenter"
            value={parameters.suggestedCostCenter}
            onChange={(e) => onUpdate({ suggestedCostCenter: e.target.value })}
            placeholder="Ej: Administración, Ventas, etc."
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="defaultARLRiskLevel">Nivel de riesgo ARL por defecto</Label>
          <Select 
            value={parameters.defaultARLRiskLevel} 
            onValueChange={(value: any) => onUpdate({ defaultARLRiskLevel: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARL_RISK_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 text-sm">
          📋 Estos valores aparecerán precargados al crear nuevos empleados, pero podrán ser modificados según sea necesario.
        </p>
      </div>
    </Card>
  );
};
