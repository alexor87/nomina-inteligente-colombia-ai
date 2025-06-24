import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Employee } from '@/types';
import { CONTRACT_TYPES } from '@/types/employee-config';
import { ESTADOS_EMPLEADO } from '@/types/employee-extended';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

interface EmployeeFormData {
  cedula: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  eps: string;
  afp: string;
  arl: string;
  cajaCompensacion: string;
  cargo: string;
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  banco: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta: string;
  titularCuenta: string;
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
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EmployeeFormData>({
    defaultValues: {
      cedula: employee?.cedula || '',
      nombre: employee?.nombre || '',
      apellido: employee?.apellido || '',
      email: employee?.email || '',
      telefono: employee?.telefono || '',
      salarioBase: employee?.salarioBase || 0,
      tipoContrato: employee?.tipoContrato || 'indefinido',
      fechaIngreso: employee?.fechaIngreso || new Date().toISOString().split('T')[0],
      estado: employee?.estado || 'activo',
      eps: employee?.eps || '',
      afp: employee?.afp || '',
      arl: employee?.arl || '',
      cajaCompensacion: employee?.cajaCompensacion || '',
      cargo: employee?.cargo || '',
      estadoAfiliacion: employee?.estadoAfiliacion || 'pendiente',
      banco: '',
      tipoCuenta: 'ahorros',
      numeroCuenta: '',
      titularCuenta: ''
    }
  });

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

    // Crear el objeto con la estructura que espera el tipo Employee
    const employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      empresaId: companyId,
      cedula: data.cedula,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      salarioBase: Number(data.salarioBase),
      tipoContrato: data.tipoContrato,
      fechaIngreso: data.fechaIngreso,
      estado: data.estado,
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.cajaCompensacion,
      cargo: data.cargo,
      estadoAfiliacion: data.estadoAfiliacion
    };

    let result;
    if (employee) {
      result = await updateEmployee(employee.id, employeeData);
    } else {
      result = await createEmployee(employeeData);
    }

    if (result.success) {
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
              <Label htmlFor="cedula">Cédula *</Label>
              <Input
                id="cedula"
                {...register('cedula', { required: 'La cédula es requerida' })}
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
              <Select onValueChange={(value) => setValue('tipoContrato', value as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
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
              <Select onValueChange={(value) => setValue('estado', value as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_EMPLEADO.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

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
              <Select onValueChange={(value) => setValue('tipoCuenta', value as 'ahorros' | 'corriente')}>
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

        {/* Afiliaciones */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Afiliaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eps">EPS</Label>
              <Input
                id="eps"
                {...register('eps')}
                placeholder="Sura EPS"
              />
            </div>

            <div>
              <Label htmlFor="afp">AFP</Label>
              <Input
                id="afp"
                {...register('afp')}
                placeholder="Porvenir"
              />
            </div>

            <div>
              <Label htmlFor="arl">ARL</Label>
              <Input
                id="arl"
                {...register('arl')}
                placeholder="Sura ARL"
              />
            </div>

            <div>
              <Label htmlFor="cajaCompensacion">Caja de Compensación</Label>
              <Input
                id="cajaCompensacion"
                {...register('cajaCompensacion')}
                placeholder="Compensar"
              />
            </div>

            <div>
              <Label htmlFor="estadoAfiliacion">Estado Afiliación</Label>
              <Select onValueChange={(value) => setValue('estadoAfiliacion', value as 'completa' | 'pendiente' | 'inconsistente')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="inconsistente">Inconsistente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Campos Personalizados */}
        {configuration.customFields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Campos Personalizados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configuration.customFields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.name} {field.required && '*'}
                  </Label>
                  {field.type === 'text' && (
                    <Input
                      id={field.id}
                      placeholder={`Ingresa ${field.name.toLowerCase()}`}
                    />
                  )}
                  {field.type === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      placeholder={`Ingresa ${field.name.toLowerCase()}`}
                    />
                  )}
                  {field.type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                    />
                  )}
                  {field.type === 'list' && field.options && (
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccionar ${field.name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option, index) => (
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
