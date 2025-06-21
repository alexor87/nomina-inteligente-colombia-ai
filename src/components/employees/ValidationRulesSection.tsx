
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ValidationRules } from '@/types/employee-config';

interface ValidationRulesSectionProps {
  rules: ValidationRules;
  onUpdate: (rules: Partial<ValidationRules>) => void;
}

export const ValidationRulesSection = ({ rules, onUpdate }: ValidationRulesSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">🧠 Reglas de Validación Global</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowWithoutEPS"
            checked={rules.allowWithoutEPS}
            onCheckedChange={(checked) => onUpdate({ allowWithoutEPS: !!checked })}
          />
          <Label htmlFor="allowWithoutEPS">¿Permitir empleados sin EPS?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowWithoutCajaCompensacion"
            checked={rules.allowWithoutCajaCompensacion}
            onCheckedChange={(checked) => onUpdate({ allowWithoutCajaCompensacion: !!checked })}
          />
          <Label htmlFor="allowWithoutCajaCompensacion">¿Permitir empleados sin caja de compensación?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowPendingAffiliations"
            checked={rules.allowPendingAffiliations}
            onCheckedChange={(checked) => onUpdate({ allowPendingAffiliations: !!checked })}
          />
          <Label htmlFor="allowPendingAffiliations">¿Permitir afiliaciones pendientes?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="validateARLRiskLevel"
            checked={rules.validateARLRiskLevel}
            onCheckedChange={(checked) => onUpdate({ validateARLRiskLevel: !!checked })}
          />
          <Label htmlFor="validateARLRiskLevel">¿Validar que el nivel de riesgo ARL esté siempre asignado?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowEditBaseSalary"
            checked={rules.allowEditBaseSalary}
            onCheckedChange={(checked) => onUpdate({ allowEditBaseSalary: !!checked })}
          />
          <Label htmlFor="allowEditBaseSalary">¿Permitir editar salario base una vez guardado?</Label>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 Estas reglas afectan el comportamiento global del módulo de empleados y determinan qué validaciones se aplicarán al crear o editar empleados.
        </p>
      </div>
    </Card>
  );
};
