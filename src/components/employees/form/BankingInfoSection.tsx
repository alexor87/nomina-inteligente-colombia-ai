
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from 'lucide-react';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';

interface BankingInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  register: any;
}

const BANCOS_COLOMBIA = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia',
  'Banco Popular', 'Banco de Occidente', 'Banco AV Villas', 'Bancoomeva',
  'Banco Falabella', 'Banco Pichincha', 'Banco Caja Social', 'Nequi', 'Daviplata'
];

export const BankingInfoSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch,
  register
}: BankingInfoSectionProps) => {
  return (
    <Card className="mb-6 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-lg font-semibold">Información Bancaria</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            name="banco"
            label="Banco"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.banco}
            setValue={setValue}
            options={BANCOS_COLOMBIA.map(banco => ({ value: banco, label: banco }))}
            required
          />
          
          <FormField
            name="tipoCuenta"
            label="Tipo de Cuenta"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.tipoCuenta}
            setValue={setValue}
            options={[
              { value: 'ahorros', label: 'Ahorros' },
              { value: 'corriente', label: 'Corriente' }
            ]}
            required
          />
          
          <FormField
            name="numeroCuenta"
            label="Número de Cuenta"
            type="text"
            control={control}
            errors={errors}
            required
          />
          
          <div className="group">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-sm font-medium text-gray-700">
                Titular de la Cuenta <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              {...register('titularCuenta', { required: 'Titular de la cuenta es requerido' })}
              className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="Nombre completo del titular"
            />
            <p className="text-xs text-gray-500 mt-1">Se completa automáticamente con nombre y apellidos</p>
            {errors.titularCuenta && (
              <p className="text-red-500 text-xs mt-1">{errors.titularCuenta?.message}</p>
            )}
          </div>
          
          <FormField
            name="formaPago"
            label="Forma de Pago"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.formaPago}
            setValue={setValue}
            options={[
              { value: 'dispersion', label: 'Dispersión Bancaria' },
              { value: 'manual', label: 'Pago Manual' }
            ]}
            required
          />
        </div>
      </CardContent>
    </Card>
  );
};
