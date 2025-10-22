import { Button } from '@/components/ui/button';
import { Users, Calculator, ArrowRight } from 'lucide-react';

interface PayrollEmptyStateProps {
  periodLabel: string;
  onNavigateToEmployees: () => void;
}

export const PayrollEmptyState = ({ periodLabel, onNavigateToEmployees }: PayrollEmptyStateProps) => {
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
        Te llevaremos al módulo de empleados para que agregues o gestiones tus empleados
      </p>
      
      <Button 
        onClick={onNavigateToEmployees}
        size="lg"
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Users className="h-5 w-5 mr-2" />
        Ir a Módulo de Empleados
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
};
