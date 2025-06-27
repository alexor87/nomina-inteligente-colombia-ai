
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, FileText, MapPin, Mail, Phone } from 'lucide-react';
import { EmployeeFormData } from './types';
import { FormField } from './FormField';
import { TIPOS_DOCUMENTO, DEPARTAMENTOS_COLOMBIA } from '@/types/employee-config';

interface PersonalInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
}

export const PersonalInfoSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch 
}: PersonalInfoSectionProps) => {
  return (
    <Card className="mb-6 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg font-semibold">Información Personal</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            name="tipoDocumento"
            label="Tipo de Documento"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.tipoDocumento}
            setValue={setValue}
            options={TIPOS_DOCUMENTO.map(tipo => ({ value: tipo.value, label: tipo.label }))}
            required
            icon={<FileText className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="cedula"
            label="Número de Documento"
            type="text"
            control={control}
            errors={errors}
            required
          />
          
          <FormField
            name="nombre"
            label="Primer Nombre"
            type="text"
            control={control}
            errors={errors}
            required
          />
          
          <FormField
            name="segundoNombre"
            label="Segundo Nombre"
            type="text"
            control={control}
            errors={errors}
          />
          
          <FormField
            name="apellido"
            label="Apellidos"
            type="text"
            control={control}
            errors={errors}
            required
          />
          
          <FormField
            name="sexo"
            label="Sexo"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.sexo}
            setValue={setValue}
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'O', label: 'Otro' }
            ]}
            required
          />
          
          <FormField
            name="fechaNacimiento"
            label="Fecha de Nacimiento"
            type="date"
            control={control}
            errors={errors}
            required
          />
          
          <FormField
            name="direccion"
            label="Dirección"
            type="text"
            control={control}
            errors={errors}
            required
            icon={<MapPin className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="ciudad"
            label="Ciudad"
            type="text"
            control={control}
            errors={errors}
            required
          />
          
          <FormField
            name="departamento"
            label="Departamento"
            type="select"
            control={control}
            errors={errors}
            value={watchedValues.departamento}
            setValue={setValue}
            options={DEPARTAMENTOS_COLOMBIA.map(dept => ({ value: dept, label: dept }))}
            required
          />
          
          <FormField
            name="email"
            label="Email"
            type="email"
            control={control}
            errors={errors}
            required
            icon={<Mail className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="telefono"
            label="Teléfono"
            type="text"
            control={control}
            errors={errors}
            icon={<Phone className="w-4 h-4 text-gray-500" />}
          />
        </div>
      </CardContent>
    </Card>
  );
};
