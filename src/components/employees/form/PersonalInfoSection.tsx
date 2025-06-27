import { Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Calendar, MapPin, Users } from 'lucide-react';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';

interface PersonalInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  watch: UseFormWatch<EmployeeFormData>;
}

export const PersonalInfoSection = ({ 
  control, 
  errors, 
  watchedValues, 
  watch 
}: PersonalInfoSectionProps) => {
  

  const tipoDocumentoOptions = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PP', label: 'Pasaporte' },
    { value: 'NIT', label: 'NIT' },
    { value: 'RC', label: 'Registro Civil' }
  ];

  const sexoOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' }
  ];

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg text-gray-800">Información Personal</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Documento de Identidad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="tipoDocumento"
            label="Tipo de Documento"
            type="select"
            control={control}
            errors={errors}
            options={tipoDocumentoOptions}
            required
            icon={<User className="w-4 h-4 text-gray-500" />}
          />
          
          <div className="md:col-span-2">
            <FormField
              name="cedula"
              label="Número de Documento"
              type="text"
              control={control}
              errors={errors}
              required
              icon={<User className="w-4 h-4 text-gray-500" />}
              helpText="Número único de identificación"
            />
          </div>
        </div>

        {/* Nombres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="nombre"
            label="Primer Nombre"
            type="text"
            control={control}
            errors={errors}
            required
            icon={<User className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="segundoNombre"
            label="Segundo Nombre"
            type="text"
            control={control}
            errors={errors}
            icon={<User className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="apellido"
            label="Apellidos"
            type="text"
            control={control}
            errors={errors}
            required
            icon={<User className="w-4 h-4 text-gray-500" />}
          />
        </div>

        {/* Contacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="email"
            label="Correo Electrónico"
            type="email"
            control={control}
            errors={errors}
            required
            icon={<Mail className="w-4 h-4 text-gray-500" />}
            helpText="Email corporativo o personal"
          />
          
          <FormField
            name="telefono"
            label="Teléfono"
            type="text"
            control={control}
            errors={errors}
            icon={<Phone className="w-4 h-4 text-gray-500" />}
            helpText="Número de contacto principal"
          />
        </div>

        {/* Información Personal Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="sexo"
            label="Sexo"
            type="select"
            control={control}
            errors={errors}
            options={sexoOptions}
            icon={<Users className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="fechaNacimiento"
            label="Fecha de Nacimiento"
            type="date"
            control={control}
            errors={errors}
            icon={<Calendar className="w-4 h-4 text-gray-500" />}
          />
        </div>

        {/* Ubicación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="direccion"
            label="Dirección"
            type="text"
            control={control}
            errors={errors}
            icon={<MapPin className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="ciudad"
            label="Ciudad"
            type="text"
            control={control}
            errors={errors}
            icon={<MapPin className="w-4 h-4 text-gray-500" />}
          />
          
          <FormField
            name="departamento"
            label="Departamento"
            type="text"
            control={control}
            errors={errors}
            icon={<MapPin className="w-4 h-4 text-gray-500" />}
          />
        </div>
      </CardContent>
    </Card>
  );
};
