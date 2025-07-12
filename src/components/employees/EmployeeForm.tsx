import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EmployeeUnified } from '@/types/employee-unified';
import { CONTRACT_TYPES, TIPOS_DOCUMENTO } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { AffiliationsSection } from './form/AffiliationsSection';
import { EmployeeFormData } from './form/types';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeFormProps {
  employee?: EmployeeUnified;
  onSuccess: () => void;
  onCancel: () => void;
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

export const EmployeeForm = ({ employee, onSuccess, onCancel }: EmployeeFormProps) => {
  const { configuration } = useEmployeeGlobalConfiguration();
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUD();
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<EmployeeFormData>({
    defaultValues: {
      cedula: employee?.cedula || '',
      tipoDocumento: employee?.tipoDocumento || 'CC',
      nombre: employee?.nombre || '',
      segundoNombre: employee?.segundoNombre || '',
      apellido: employee?.apellido || '',
      email: employee?.email || '',
      telefono: employee?.telefono || '',
      sexo: employee?.sexo || 'M',
      fechaNacimiento: employee?.fechaNacimiento || '',
      direccion: employee?.direccion || '',
      ciudad: employee?.ciudad || '',
      departamento: employee?.departamento || '',
      salarioBase: employee?.salarioBase || 0,
      tipoContrato: employee?.tipoContrato || 'indefinido',
      fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
      periodicidadPago: employee?.periodicidadPago || 'mensual',
      cargo: employee?.cargo || '',
      codigoCiiu: employee?.codigoCiiu || '',
      nivelRiesgoArl: employee?.nivelRiesgoArl || 'I',
      estado: employee?.estado || 'activo',
      centroCostos: employee?.centroCostos || '',
      fechaFirmaContrato: employee?.fechaFirmaContrato || '',
      fechaFinalizacionContrato: employee?.fechaFinalizacionContrato || '',
      tipoJornada: employee?.tipoJornada || 'completa',
      diasTrabajo: employee?.diasTrabajo || 30,
      horasTrabajo: employee?.horasTrabajo || 8,
      beneficiosExtralegales: employee?.beneficiosExtralegales || false,
      clausulasEspeciales: employee?.clausulasEspeciales || '',
      banco: employee?.banco || '',
      tipoCuenta: employee?.tipoCuenta || 'ahorros',
      numeroCuenta: employee?.numeroCuenta || '',
      titularCuenta: employee?.titularCuenta || '',
      formaPago: employee?.formaPago || 'dispersion',
      eps: employee?.eps || '',
      afp: employee?.afp || '',
      arl: employee?.arl || '',
      cajaCompensacion: employee?.cajaCompensacion || '',
      tipoCotizanteId: employee?.tipoCotizanteId || '',
      subtipoCotizanteId: employee?.subtipoCotizanteId || '',
      regimenSalud: employee?.regimenSalud || 'contributivo',
      estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente'
    }
  });

  // Watch all form values for the AffiliationsSection 
  const watchedValues = watch();

  // Obtener company_id del usuario actual
  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      } catch (error) {
        console.error('Error loading company ID:', error);
      }
    };

    loadCompanyId();
  }, []);

  const onSubmit = async (data: EmployeeFormData) => {
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    console.log('Creando empleado para empresa:', companyId);

    // Create the object with the structure expected by EmployeeUnified type
    const employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> = {
      company_id: companyId,
      cedula: data.cedula,
      tipoDocumento: data.tipoDocumento,
      nombre: data.nombre,
      segundoNombre: data.segundoNombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      sexo: data.sexo,
      fechaNacimiento: data.fechaNacimiento,
      direccion: data.direccion,
      ciudad: data.ciudad,
      departamento: data.departamento,
      salarioBase: Number(data.salarioBase),
      tipoContrato: data.tipoContrato,
      fechaIngreso: data.fechaIngreso,
      periodicidadPago: data.periodicidadPago,
      cargo: data.cargo,
      codigoCiiu: data.codigoCiiu,
      nivelRiesgoArl: data.nivelRiesgoArl,
      estado: data.estado as any,
      centroCostos: data.centroCostos,
      fechaFirmaContrato: data.fechaFirmaContrato,
      fechaFinalizacionContrato: data.fechaFinalizacionContrato,
      tipoJornada: data.tipoJornada,
      diasTrabajo: data.diasTrabajo,
      horasTrabajo: data.horasTrabajo,
      beneficiosExtralegales: data.beneficiosExtralegales,
      clausulasEspeciales: data.clausulasEspeciales,
      banco: data.banco,
      tipoCuenta: data.tipoCuenta,
      numeroCuenta: data.numeroCuenta,
      titularCuenta: data.titularCuenta,
      formaPago: data.formaPago,
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.cajaCompensacion,
      tipoCotizanteId: data.tipoCotizanteId,
      subtipoCotizanteId: data.subtipoCotizanteId,
      regimenSalud: data.regimenSalud,
      estadoAfiliacion: data.estadoAfiliacion,
      customFields: data.customFields || {}
    };

    let result;
    if (employee?.id) {
      result = await updateEmployee(employee.id, employeeData);
    } else {
      result = await createEmployee(employeeData);
    }

    if (result.success) {
      console.log('✅ Employee saved successfully, calling onSuccess callback');
      onSuccess();
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
        </h2>
        <p className="text-gray-600 mt-1">
          {employee ? 'Actualiza la información del empleado' : 'Completa la información para crear un nuevo empleado'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Personal */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
              <Select onValueChange={(value) => setValue('tipoDocumento', value)}>
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
            </div>

            <div>
              <Label htmlFor="cedula">Número de Documento *</Label>
              <Input
                id="cedula"
                {...register('cedula', { required: 'El número de documento es requerido' })}
                placeholder="12345678"
              />
              {errors.cedula && <p className="text-red-500 text-sm mt-1">{errors.cedula.message}</p>}
            </div>

            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                {...register('nombre', { required: 'El nombre es requerido' })}
                placeholder="Juan"
              />
              {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>}
            </div>

            <div>
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                {...register('apellido', { required: 'El apellido es requerido' })}
                placeholder="Pérez"
              />
              {errors.apellido && <p className="text-red-500 text-sm mt-1">{errors.apellido.message}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { required: 'El email es requerido' })}
                placeholder="juan.perez@empresa.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                {...register('telefono')}
                placeholder="3001234567"
              />
            </div>

            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                {...register('cargo')}
                placeholder="Desarrollador Senior"
              />
            </div>
          </div>
        </div>

        {/* Información Laboral */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salarioBase">Salario Base *</Label>
              <Input
                id="salarioBase"
                type="number"
                {...register('salarioBase', { required: 'El salario es requerido', min: 1 })}
                placeholder="2500000"
              />
              {errors.salarioBase && <p className="text-red-500 text-sm mt-1">{errors.salarioBase.message}</p>}
            </div>

            <div>
              <Label htmlFor="tipoContrato">Tipo de Contrato *</Label>
              <Select onValueChange={(value) => setValue('tipoContrato', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="fijo">Término Fijo</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="aprendizaje">Contrato de Aprendizaje</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
              <Input
                id="fechaIngreso"
                type="date"
                {...register('fechaIngreso', { required: 'La fecha de ingreso es requerida' })}
              />
              {errors.fechaIngreso && <p className="text-red-500 text-sm mt-1">{errors.fechaIngreso.message}</p>}
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select onValueChange={(value) => setValue('estado', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Activo
                    </span>
                  </SelectItem>
                  <SelectItem value="inactivo">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Inactivo
                    </span>
                  </SelectItem>
                  <SelectItem value="vacaciones">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      En Vacaciones
                    </span>
                  </SelectItem>
                  <SelectItem value="incapacidad">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Incapacitado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Afiliaciones - Now using the proper AffiliationsSection component */}
        <AffiliationsSection
          control={control}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        {/* Información Bancaria */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información Bancaria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="banco">Banco *</Label>
              <Select onValueChange={(value) => setValue('banco', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS_COLOMBIA.map((banco) => (
                    <SelectItem key={banco} value={banco}>
                      {banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.banco && <p className="text-red-500 text-sm mt-1">{errors.banco.message}</p>}
            </div>

            <div>
              <Label htmlFor="tipoCuenta">Tipo de Cuenta *</Label>
              <Select onValueChange={(value) => setValue('tipoCuenta', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ahorros">Ahorros</SelectItem>
                  <SelectItem value="corriente">Corriente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="numeroCuenta">Número de Cuenta *</Label>
              <Input
                id="numeroCuenta"
                {...register('numeroCuenta', { required: 'El número de cuenta es requerido' })}
                placeholder="1234567890"
              />
              {errors.numeroCuenta && <p className="text-red-500 text-sm mt-1">{errors.numeroCuenta.message}</p>}
            </div>

            <div>
              <Label htmlFor="titularCuenta">Titular de la Cuenta *</Label>
              <Input
                id="titularCuenta"
                {...register('titularCuenta', { required: 'El titular de la cuenta es requerido' })}
                placeholder="Juan Pérez"
              />
              {errors.titularCuenta && <p className="text-red-500 text-sm mt-1">{errors.titularCuenta.message}</p>}
            </div>
          </div>
        </div>

        {/* Campos Personalizados */}
        {configuration?.custom_fields && configuration.custom_fields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Campos Personalizados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configuration.custom_fields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.field_label} {field.is_required && '*'}
                  </Label>
                  {field.field_type === 'text' && (
                    <Input
                      id={field.id}
                      placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
                    />
                  )}
                  {field.field_type === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      placeholder={`Ingresa ${field.field_label.toLowerCase()}`}
                    />
                  )}
                  {field.field_type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                    />
                  )}
                  {field.field_type === 'select' && field.field_options && (
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccionar ${field.field_label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(field.field_options) && field.field_options.map((option, index) => (
                          <SelectItem key={index} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4 pt-6 border-t">
          <Button type="submit" disabled={isLoading} className="flex-1 md:flex-none">
            {isLoading ? 'Guardando...' : employee ? 'Actualizar Empleado' : 'Crear Empleado'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
};
