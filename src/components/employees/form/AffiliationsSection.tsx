
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeUnified } from '@/types/employee-unified';

interface AffiliationsSectionProps {
  formData: Partial<EmployeeUnified>;
  updateFormData: (data: Partial<EmployeeUnified>) => void;
  errors: Record<string, string>;
}

export const AffiliationsSection = ({ formData, updateFormData, errors }: AffiliationsSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eps">EPS *</Label>
          <Input
            id="eps"
            value={formData.eps || ''}
            onChange={(e) => updateFormData({ eps: e.target.value })}
            placeholder="Ingrese la EPS"
          />
          {errors.eps && <p className="text-red-500 text-sm">{errors.eps}</p>}
        </div>

        <div>
          <Label htmlFor="afp">AFP/Pensión *</Label>
          <Input
            id="afp"
            value={formData.afp || ''}
            onChange={(e) => updateFormData({ afp: e.target.value })}
            placeholder="Ingrese el fondo de pensiones"
          />
          {errors.afp && <p className="text-red-500 text-sm">{errors.afp}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="arl">ARL</Label>
          <Input
            id="arl"
            value={formData.arl || ''}
            onChange={(e) => updateFormData({ arl: e.target.value })}
            placeholder="Ingrese la ARL"
          />
        </div>

        <div>
          <Label htmlFor="cajaCompensacion">Caja de Compensación</Label>
          <Input
            id="cajaCompensacion"
            value={formData.cajaCompensacion || ''}
            onChange={(e) => updateFormData({ cajaCompensacion: e.target.value })}
            placeholder="Ingrese la caja de compensación"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="regimenSalud">Régimen de Salud</Label>
          <Select 
            value={formData.regimenSalud || 'contributivo'} 
            onValueChange={(value) => updateFormData({ regimenSalud: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contributivo">Contributivo</SelectItem>
              <SelectItem value="subsidiado">Subsidiado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="estadoAfiliacion">Estado de Afiliación</Label>
          <Select 
            value={formData.estadoAfiliacion || 'pendiente'} 
            onValueChange={(value) => updateFormData({ estadoAfiliacion: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completa">Completa</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="inconsistente">Inconsistente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
