
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeUnified } from '@/types/employee-unified';

interface BankingInfoSectionProps {
  formData: Partial<EmployeeUnified>;
  updateFormData: (data: Partial<EmployeeUnified>) => void;
  errors: Record<string, string>;
}

export const BankingInfoSection = ({ formData, updateFormData, errors }: BankingInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="banco">Banco *</Label>
          <Input
            id="banco"
            value={formData.banco || ''}
            onChange={(e) => updateFormData({ banco: e.target.value })}
            placeholder="Ingrese el banco"
          />
          {errors.banco && <p className="text-red-500 text-sm">{errors.banco}</p>}
        </div>

        <div>
          <Label htmlFor="tipoCuenta">Tipo de Cuenta *</Label>
          <Select 
            value={formData.tipoCuenta || 'ahorros'} 
            onValueChange={(value) => updateFormData({ tipoCuenta: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ahorros">Ahorros</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipoCuenta && <p className="text-red-500 text-sm">{errors.tipoCuenta}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
          <Input
            id="numeroCuenta"
            value={formData.numeroCuenta || ''}
            onChange={(e) => updateFormData({ numeroCuenta: e.target.value })}
            placeholder="Ingrese el número de cuenta"
          />
        </div>

        <div>
          <Label htmlFor="titularCuenta">Titular de la Cuenta</Label>
          <Input
            id="titularCuenta"
            value={formData.titularCuenta || ''}
            onChange={(e) => updateFormData({ titularCuenta: e.target.value })}
            placeholder="Nombre del titular"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="formaPago">Forma de Pago</Label>
        <Select 
          value={formData.formaPago || 'dispersion'} 
          onValueChange={(value) => updateFormData({ formaPago: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dispersion">Dispersión Bancaria</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
