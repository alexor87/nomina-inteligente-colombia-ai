
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';

interface PayrollLiquidationHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const PayrollLiquidationHeader = ({ onRefresh, isLoading }: PayrollLiquidationHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Liquidación de Nómina</h1>
        <p className="text-gray-600 mt-1">
          Gestiona el proceso de liquidación y cálculo de nómina
        </p>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </Button>
        
        <Button
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Configuración</span>
        </Button>
      </div>
    </div>
  );
};
