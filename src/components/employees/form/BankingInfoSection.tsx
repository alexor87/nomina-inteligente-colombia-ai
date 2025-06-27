
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Building, Hash, User } from 'lucide-react';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';

interface BankingInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  register: any;
}

export const BankingInfoSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch,
  register 
}: BankingInfoSectionProps) => {
  const tipoCuentaOptions = [
    { value: 'ahorros', label: 'Ahorros' },
    { value: 'corriente', label: 'Corriente' }
  ];

  const formaPagoOptions = [
    { value: 'dispersion', label: 'Dispersión Bancaria' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'cheque', label: 'Cheque' }
  ];

  const bancoOptions = [
    { value: 'bancolombia', label: 'Bancolombia' },
    { value: 'banco_bogota', label: 'Banco de Bogotá' },
    { value: 'banco_popular', label: 'Banco Popular' },
    { value: 'bbva', label: 'BBVA Colombia' },
    { value: 'banco_occidente', label: 'Banco de Occidente' },
    { value: 'banco_santander', label: 'Banco Santander' },
    { value: 'banco_caja_social', label: 'Banco Caja Social' },
    { value: 'banco_av_villas', label: 'Banco AV Villas' },
    { value: 'banco_davivienda', label: 'Banco Davivienda' },
    { value: 'banco_falabella', label: 'Banco Falabella' },
    { value: 'banco_pichincha', label: 'Banco Pichincha' },
    { value: 'banco_gnb_sudameris', label: 'Banco GNB Sudameris' },
    { value: 'banco_itau', label: 'Banco Itaú' },
    { value: 'banco_agrario', label: 'Banco Agrario' },
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'DaviPlata' },
    { value: 'otro', label: 'Otro' }
  ];

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-lg text-gray-800">Información Bancaria</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forma de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <FormField
            name="formaPago"
            label="Forma de Pago"
            type="select"
            control={control}
            errors={errors}
            options={formaPagoOptions}
            icon={<CreditCard className="w-4 h-4 text-gray-500" />}
          />
        </div>

        {/* Información Bancaria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="banco"
            label="Banco"
            type="select"
            control={control}
            errors={errors}
            options={bancoOptions}
            icon={<Building className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="tipoCuenta"
            label="Tipo de Cuenta"
            type="select"
            control={control}
            errors={errors}
            options={tipoCuentaOptions}
            icon={<CreditCard className="w-4 h-4 text-gray-500" />}
          />
        </div>

        {/* Número de Cuenta y Titular */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="numeroCuenta"
            label="Número de Cuenta"
            type="text"
            control={control}
            errors={errors}
            icon={<Hash className="w-4 h-4 text-gray-500" />}
            helpText="Número de cuenta bancaria"
          />
          
          <FormField
            name="titularCuenta"
            label="Titular de la Cuenta"
            type="text"
            control={control}
            errors={errors}
            icon={<User className="w-4 h-4 text-gray-500" />}
            helpText="Nombre completo del titular"
          />
        </div>
      </CardContent>
    </Card>
  );
};
