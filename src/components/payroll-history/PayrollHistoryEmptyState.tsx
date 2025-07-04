
import React from 'react';
import { Button } from '@/components/ui/button';
import { History, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PayrollHistoryEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export const PayrollHistoryEmptyState: React.FC<PayrollHistoryEmptyStateProps> = ({
  hasFilters = false,
  onClearFilters
}) => {
  const navigate = useNavigate();

  const handleCreatePeriod = () => {
    navigate('/app/payroll');
  };

  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No se encontraron períodos
        </h3>
        <p className="text-gray-500 mb-4">
          No hay períodos que coincidan con los filtros aplicados.
        </p>
        <Button onClick={onClearFilters} variant="outline">
          Limpiar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No hay períodos de nómina
      </h3>
      <p className="text-gray-500 mb-6">
        Comienza creando tu primer período de nómina para ver el historial aquí.
      </p>
      <Button onClick={handleCreatePeriod} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Crear primer período
      </Button>
    </div>
  );
};
