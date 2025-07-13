
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NovedadesTotals } from '@/services/NovedadesCalculationService';
import { formatCurrency } from '@/lib/utils';

interface NovedadesCellProps {
  novedades: NovedadesTotals;
  isCreating: boolean;
  onOpenModal: () => void;
}

export const NovedadesCell: React.FC<NovedadesCellProps> = ({
  novedades,
  isCreating,
  onOpenModal
}) => {
  return (
    <TableCell className="text-center">
      <div className="flex items-center justify-center space-x-2">
        <div className={`text-sm font-medium flex items-center space-x-1 ${
          novedades.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>+</span>
          <span>{formatCurrency(novedades.totalNeto)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenModal}
          disabled={isCreating}
          className="h-8 w-8 p-0 rounded-full border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  );
};
