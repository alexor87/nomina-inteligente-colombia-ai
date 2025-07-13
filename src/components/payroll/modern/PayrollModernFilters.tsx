
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const PayrollModernFilters: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="procesada">Procesada</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="gerente">Gerente</SelectItem>
              <SelectItem value="empleado">Empleado</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            Limpiar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
