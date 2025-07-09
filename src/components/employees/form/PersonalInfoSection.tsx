
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeUnified } from '@/types/employee-unified';

interface PersonalInfoSectionProps {
  formData: Partial<EmployeeUnified>;
  updateFormData: (data: Partial<EmployeeUnified>) => void;
  errors: Record<string, string>;
}

export const PersonalInfoSection = ({ formData, updateFormData, errors }: PersonalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
          <Select 
            value={formData.tipoDocumento || 'CC'} 
            onValueChange={(value) => updateFormData({ tipoDocumento: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
              <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
              <SelectItem value="PA">Pasaporte</SelectItem>
              <SelectItem value="RC">Registro Civil</SelectItem>
              <SelectItem value="NIT">NIT</SelectItem>
              <SelectItem value="PEP">PEP</SelectItem>
              <SelectItem value="PPT">PPT</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipoDocumento && <p className="text-red-500 text-sm">{errors.tipoDocumento}</p>}
        </div>

        <div>
          <Label htmlFor="cedula">Número de Documento *</Label>
          <Input
            id="cedula"
            value={formData.cedula || ''}
            onChange={(e) => updateFormData({ cedula: e.target.value })}
            placeholder="Ingrese el número de documento"
          />
          {errors.cedula && <p className="text-red-500 text-sm">{errors.cedula}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nombre">Primer Nombre *</Label>
          <Input
            id="nombre"
            value={formData.nombre || ''}
            onChange={(e) => updateFormData({ nombre: e.target.value })}
            placeholder="Ingrese el primer nombre"
          />
          {errors.nombre && <p className="text-red-500 text-sm">{errors.nombre}</p>}
        </div>

        <div>
          <Label htmlFor="segundoNombre">Segundo Nombre</Label>
          <Input
            id="segundoNombre"
            value={formData.segundoNombre || ''}
            onChange={(e) => updateFormData({ segundoNombre: e.target.value })}
            placeholder="Ingrese el segundo nombre (opcional)"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="apellido">Apellidos *</Label>
        <Input
          id="apellido"
          value={formData.apellido || ''}
          onChange={(e) => updateFormData({ apellido: e.target.value })}
          placeholder="Ingrese los apellidos"
        />
        {errors.apellido && <p className="text-red-500 text-sm">{errors.apellido}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => updateFormData({ email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={formData.telefono || ''}
            onChange={(e) => updateFormData({ telefono: e.target.value })}
            placeholder="Ingrese el teléfono"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sexo">Sexo</Label>
          <Select 
            value={formData.sexo || ''} 
            onValueChange={(value) => updateFormData({ sexo: value as 'M' | 'F' | 'O' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
              <SelectItem value="O">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
          <Input
            id="fechaNacimiento"
            type="date"
            value={formData.fechaNacimiento || ''}
            onChange={(e) => updateFormData({ fechaNacimiento: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            value={formData.direccion || ''}
            onChange={(e) => updateFormData({ direccion: e.target.value })}
            placeholder="Dirección de residencia"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input
            id="ciudad"
            value={formData.ciudad || ''}
            onChange={(e) => updateFormData({ ciudad: e.target.value })}
            placeholder="Ciudad de residencia"
          />
        </div>

        <div>
          <Label htmlFor="departamento">Departamento</Label>
          <Input
            id="departamento"
            value={formData.departamento || ''}
            onChange={(e) => updateFormData({ departamento: e.target.value })}
            placeholder="Departamento"
          />
        </div>
      </div>
    </div>
  );
};
