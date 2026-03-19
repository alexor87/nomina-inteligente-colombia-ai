import { Button } from '@/components/ui/button';
import { Users, Calculator, ArrowRight, UserPlus } from 'lucide-react';

interface PayrollEmptyStateProps {
  periodLabel: string;
  onNavigateToEmployees: () => void;
  onAddEmployee?: () => void;
}

export const PayrollEmptyState = ({ periodLabel, onNavigateToEmployees, onAddEmployee }: PayrollEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-blue-50 p-6 rounded-full mb-6">
        <Calculator className="h-16 w-16 text-blue-600" />
      </div>

      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        No hay empleados en este período
      </h3>

      <p className="text-gray-600 text-center max-w-md mb-2">
        Para liquidar la nómina del período <span className="font-medium">{periodLabel}</span>,
        primero debes agregar empleados.
      </p>

      <p className="text-gray-500 text-sm text-center max-w-md mb-6">
        Agrega empleados existentes al período o ve al módulo de empleados para crear nuevos
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {onAddEmployee && (
          <Button
            onClick={onAddEmployee}
            size="lg"
            className="w-full"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Agregar Empleado al Período
          </Button>
        )}
        <Button
          onClick={onNavigateToEmployees}
          size="lg"
          variant="outline"
          className="w-full"
        >
          <Users className="h-5 w-5 mr-2" />
          Ir a Módulo de Empleados
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
