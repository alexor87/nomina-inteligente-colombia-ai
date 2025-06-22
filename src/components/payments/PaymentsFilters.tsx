
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentFilters, PaymentEmployee } from '@/types/payments';

interface PaymentsFiltersProps {
  filters: PaymentFilters;
  onFiltersChange: (filters: PaymentFilters) => void;
  employees: PaymentEmployee[];
}

export const PaymentsFilters = ({ filters, onFiltersChange, employees }: PaymentsFiltersProps) => {
  // Obtener valores únicos para los filtros
  const uniqueBanks = [...new Set(employees.map(emp => emp.bankName).filter(Boolean))];
  const uniqueCostCenters = [...new Set(employees.map(emp => emp.costCenter).filter(Boolean))];

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado de pago
          </label>
          <Select 
            value={filters.paymentStatus || ''} 
            onValueChange={(value) => onFiltersChange({ ...filters, paymentStatus: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
              <SelectItem value="fallido">Fallido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Banco
          </label>
          <Select 
            value={filters.bankName || ''} 
            onValueChange={(value) => onFiltersChange({ ...filters, bankName: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los bancos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los bancos</SelectItem>
              {uniqueBanks.map(bank => (
                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Centro de costo
          </label>
          <Select 
            value={filters.costCenter || ''} 
            onValueChange={(value) => onFiltersChange({ ...filters, costCenter: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los centros</SelectItem>
              {uniqueCostCenters.map(center => (
                <SelectItem key={center} value={center}>{center}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="mt-6"
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </div>
  );
};
