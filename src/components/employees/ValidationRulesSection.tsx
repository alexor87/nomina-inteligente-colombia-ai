
import { Card } from '@/components/ui/card';
import { ValidationRule } from '@/types/employee-config';

interface ValidationRulesSectionProps {
  validationRules: ValidationRule[];
}

export const ValidationRulesSection = ({ validationRules }: ValidationRulesSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">🔧 Reglas de Validación</h3>
      
      <div className="text-center py-8 text-gray-500">
        <p className="mb-2">Próximamente: Sistema de validaciones personalizadas</p>
        <p className="text-sm">
          Podrás crear reglas de validación específicas para campos personalizados,
          como formatos de email, rangos numéricos, patrones de texto, etc.
        </p>
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-amber-800 text-sm">
          🚧 En desarrollo: Sistema avanzado de validaciones que permitirá crear reglas complejas 
          para asegurar la integridad de los datos de empleados.
        </p>
      </div>
    </Card>
  );
};
