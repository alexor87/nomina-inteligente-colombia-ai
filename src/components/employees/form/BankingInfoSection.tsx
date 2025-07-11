
import React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';

interface BankingInfoSectionProps {
  control?: Control<EmployeeFormData>;
  errors?: FieldErrors<EmployeeFormData>;
  watchedValues?: EmployeeFormData;
  setValue?: UseFormSetValue<EmployeeFormData>;
  watch?: UseFormWatch<EmployeeFormData>;
  register?: any;
  formData?: any;
  updateFormData?: (data: any) => void;
}

const BANCOS_COLOMBIA = [
  'Bancolombia',
  'Banco de Bogotá',
  'Davivienda',
  'BBVA Colombia',
  'Banco Popular',
  'Banco de Occidente',
  'Banco AV Villas',
  'Bancoomeva',
  'Banco Falabella',
  'Banco Pichincha',
  'Banco Caja Social',
  'Banco Cooperativo Coopcentral',
  'Nequi',
  'Daviplata',
  'Otro'
];

export const BankingInfoSection: React.FC<BankingInfoSectionProps> = ({
  control,
  errors = {},
  watchedValues,
  setValue,
  watch,
  register,
  formData,
  updateFormData
}) => {
  const isWizardMode = !!formData && !!updateFormData;

  if (!control && !isWizardMode) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Bancaria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="banco"
            label="Banco"
            type="select"
            control={control!}
            errors={errors}
            required
            options={BANCOS_COLOMBIA.map(banco => ({ value: banco, label: banco }))}
          />

          <FormField
            name="tipoCuenta"
            label="Tipo de Cuenta"
            type="select"
            control={control!}
            errors={errors}
            required
            options={[
              { value: 'ahorros', label: 'Ahorros' },
              { value: 'corriente', label: 'Corriente' }
            ]}
          />

          <FormField
            name="numeroCuenta"
            label="Número de Cuenta"
            type="text"
            control={control!}
            errors={errors}
            required
            placeholder="1234567890"
          />

          <FormField
            name="titularCuenta"
            label="Titular de la Cuenta"
            type="text"
            control={control!}
            errors={errors}
            required
            placeholder="Juan Pérez"
          />

          <FormField
            name="formaPago"
            label="Forma de Pago"
            type="select"
            control={control!}
            errors={errors}
            options={[
              { value: 'dispersion', label: 'Dispersión Bancaria' },
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'cheque', label: 'Cheque' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};
