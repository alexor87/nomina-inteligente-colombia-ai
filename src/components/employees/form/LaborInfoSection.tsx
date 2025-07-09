
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeUnified } from '@/types/employee-unified';

interface LaborInfoSectionProps {
  formData: Partial<EmployeeUnified>;
  updateFormData: (data: Partial<EmployeeUnified>) => void;
  errors: Record<string, string>;
}

export const LaborInfoSection = ({ formData, updateFormData, errors }: LaborInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="salarioBase">Salario Base *</Label>
          <Input
            id="salarioBase"
            type="number"
            min="0"
            value={formData.salarioBase || ''}
            onChange={(e) => updateFormData({ salarioBase: parseFloat(e.target.value) || 0 })}
            placeholder="Ingrese el salario base"
          />
          {errors.salarioBase && <p className="text-red-500 text-sm">{errors.salarioBase}</p>}
        </div>

        <div>
          <Label htmlFor="cargo">Cargo *</Label>
          <Input
            id="cargo"
            value={formData.cargo || ''}
            onChange={(e) => updateFormData({ cargo: e.target.value })}
            placeholder="Ingrese el cargo"
          />
          {errors.cargo && <p className="text-red-500 text-sm">{errors.cargo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
          <Select 
            value={formData.tipoContrato || 'indefinido'} 
            onValueChange={(value) => updateFormData({ tipoContrato: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="indefinido">Indefinido</SelectItem>
              <SelectItem value="fijo">Término Fijo</SelectItem>
              <SelectItem value="obra">Obra o Labor</SelectItem>
              <SelectItem value="aprendizaje">Aprendizaje</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
          <Input
            id="fechaIngreso"
            type="date"
            value={formData.fechaIngreso || ''}
            onChange={(e) => updateFormData({ fechaIngreso: e.target.value })}
          />
          {errors.fechaIngreso && <p className="text-red-500 text-sm">{errors.fechaIngreso}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
          <Select 
            value={formData.periodicidadPago || 'mensual'} 
            onValueChange={(value) => updateFormData({ periodicidadPago: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="estado">Estado</Label>
          <Select 
            value={formData.estado || 'activo'} 
            onValueChange={(value) => updateFormData({ estado: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="vacaciones">Vacaciones</SelectItem>
              <SelectItem value="incapacidad">Incapacidad</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
