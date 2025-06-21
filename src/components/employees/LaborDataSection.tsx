
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LaborData, CONTRACT_TYPES, WORKDAY_TYPES, ARL_RISK_LEVELS } from '@/types/employee-config';
import { SALARIO_MINIMO_2024 } from '@/constants';

interface LaborDataSectionProps {
  data: LaborData;
  onUpdate: (data: Partial<LaborData>) => void;
  getARLPercentage: () => number;
}

export const LaborDataSection = ({ data, onUpdate, getARLPercentage }: LaborDataSectionProps) => {
  const isApprentice = data.contractType === 'aprendiz';

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">💼 Datos Laborales</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="position">Cargo *</Label>
          <Input
            id="position"
            value={data.position}
            onChange={(e) => onUpdate({ position: e.target.value })}
            placeholder="Cargo o posición"
          />
        </div>

        <div>
          <Label htmlFor="contractType">Tipo de Contrato *</Label>
          <Select value={data.contractType} onValueChange={(value) => onUpdate({ contractType: value as any })}>
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
          <Label htmlFor="startDate">Fecha de Ingreso *</Label>
          <Input
            id="startDate"
            type="date"
            value={data.startDate}
            onChange={(e) => onUpdate({ startDate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="endDate">Fecha de Salida (Si aplica)</Label>
          <Input
            id="endDate"
            type="date"
            value={data.endDate || ''}
            onChange={(e) => onUpdate({ endDate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="baseSalary">Salario Base Mensual *</Label>
          <Input
            id="baseSalary"
            type="number"
            value={data.baseSalary}
            onChange={(e) => onUpdate({ baseSalary: Number(e.target.value) })}
            placeholder="Salario en pesos colombianos"
            max={isApprentice ? SALARIO_MINIMO_2024 : undefined}
          />
          {isApprentice && data.baseSalary > SALARIO_MINIMO_2024 && (
            <p className="text-red-600 text-sm mt-1">
              El salario de un aprendiz no puede exceder ${SALARIO_MINIMO_2024.toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="costCenter">Centro de Costo</Label>
          <Select value={data.costCenter} onValueChange={(value) => onUpdate({ costCenter: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar centro de costo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="administracion">Administración</SelectItem>
              <SelectItem value="ventas">Ventas</SelectItem>
              <SelectItem value="produccion">Producción</SelectItem>
              <SelectItem value="sistemas">Sistemas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="paymentPeriodicity">Periodicidad de Pago</Label>
          <Select value={data.paymentPeriodicity} onValueChange={(value) => onUpdate({ paymentPeriodicity: value as any })}>
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
          <Label htmlFor="workdayHours">Horas por Día</Label>
          <Input
            id="workdayHours"
            type="number"
            value={data.workdayHours}
            onChange={(e) => onUpdate({ workdayHours: Number(e.target.value) })}
            min="1"
            max="12"
          />
        </div>

        <div>
          <Label htmlFor="workdayType">Tipo de Jornada</Label>
          <Select value={data.workdayType} onValueChange={(value) => onUpdate({ workdayType: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKDAY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="flexibleSchedule"
            checked={data.flexibleSchedule}
            onCheckedChange={(checked) => onUpdate({ flexibleSchedule: !!checked })}
          />
          <Label htmlFor="flexibleSchedule">¿Es jornada flexible?</Label>
        </div>

        <div>
          <Label htmlFor="arlRiskLevel">Nivel de Riesgo ARL *</Label>
          <Select value={data.arlRiskLevel} onValueChange={(value) => onUpdate({ arlRiskLevel: value as any })}>
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
          <p className="text-sm text-gray-600 mt-1">
            Tarifa actual: {(getARLPercentage() * 100).toFixed(3)}%
          </p>
        </div>
      </div>
    </Card>
  );
};
