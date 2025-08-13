
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Upload } from 'lucide-react';
import { ImportNovedadesDrawer } from '../novedades/import/ImportNovedadesDrawer';

interface PayrollInlineFiltersProps {
  onLiquidate: () => void;
  isLoading: boolean;
  periodId?: string;
  onImportComplete?: () => void;
}

export const PayrollInlineFilters: React.FC<PayrollInlineFiltersProps> = ({
  onLiquidate,
  isLoading,
  periodId,
  onImportComplete
}) => {
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);

  const handleImportComplete = () => {
    setIsImportDrawerOpen(false);
    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Contrato */}
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinido">Indefinido</SelectItem>
                <SelectItem value="fijo">Fijo</SelectItem>
                <SelectItem value="obra">Obra</SelectItem>
              </SelectContent>
            </Select>

            {/* Sede */}
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="sucursal">Sucursal</SelectItem>
              </SelectContent>
            </Select>

            {/* Buscar */}
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar empleado..."
                className="pl-10"
              />
            </div>

            {/* Prestaciones sociales */}
            <Button variant="outline">
              Prestaciones sociales
            </Button>

            {/* Cargar novedades */}
            <Button 
              variant="outline"
              onClick={() => setIsImportDrawerOpen(true)}
              disabled={!periodId}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Cargar novedades
            </Button>

            {/* Liquidar nómina */}
            <Button
              onClick={onLiquidate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
            >
              Liquidar nómina
            </Button>
          </div>
        </div>
      </div>

      {/* Import Drawer */}
      {periodId && (
        <ImportNovedadesDrawer
          isOpen={isImportDrawerOpen}
          onClose={() => setIsImportDrawerOpen(false)}
          onImportComplete={handleImportComplete}
          periodId={periodId}
        />
      )}
    </>
  );
};
