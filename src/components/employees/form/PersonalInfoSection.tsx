
import { Control, FieldErrors, UseFormWatch } from 'react-hook-form';
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
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-6">Información Personal</h2>
        
        <div className="space-y-6">
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
            />
            
            <div className="md:col-span-2">
              <FormField
                name="cedula"
                label="Número de Documento"
                type="text"
                control={control}
                errors={errors}
                required
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
            />
            
            <FormField
              name="telefono"
              label="Teléfono"
              type="text"
              control={control}
              errors={errors}
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
            />
            
            <FormField
              name="fechaNacimiento"
              label="Fecha de Nacimiento"
              type="date"
              control={control}
              errors={errors}
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
            />
            
            <FormField
              name="ciudad"
              label="Ciudad"
              type="text"
              control={control}
              errors={errors}
            />
            
            <FormField
              name="departamento"
              label="Departamento"
              type="text"
              control={control}
              errors={errors}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
