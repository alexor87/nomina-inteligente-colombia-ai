
import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { EmployeeFormData } from './types';

interface PersonalInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>; // ✅ FIXED: Use proper type
}

const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PEP', label: 'PEP' },
  { value: 'PPT', label: 'PPT' }
];

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  control,
  errors
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
            <Controller
              name="tipoDocumento"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipoDocumento && (
              <p className="text-red-500 text-sm">{errors.tipoDocumento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cedula">Número de Documento *</Label>
            <Controller
              name="cedula"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="12345678"
                />
              )}
            />
            {errors.cedula && (
              <p className="text-red-500 text-sm">{errors.cedula.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Controller
              name="nombre"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Juan"
                />
              )}
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="segundoNombre">Segundo Nombre</Label>
            <Controller
              name="segundoNombre"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Carlos"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido *</Label>
            <Controller
              name="apellido"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Pérez"
                />
              )}
            />
            {errors.apellido && (
              <p className="text-red-500 text-sm">{errors.apellido.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="juan.perez@empresa.com"
                />
              )}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Controller
              name="telefono"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="3001234567"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sexo">Sexo</Label>
            <Controller
              name="sexo"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
            <Controller
              name="fechaNacimiento"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Controller
              name="direccion"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Calle 123 #45-67"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Controller
              name="ciudad"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Bogotá"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="departamento">Departamento</Label>
            <Controller
              name="departamento"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Cundinamarca"
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
