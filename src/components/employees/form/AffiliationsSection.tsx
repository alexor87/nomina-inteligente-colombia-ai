
import { Control, FieldErrors } from 'react-hook-form';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';
import { useAffiliationEntities } from '@/hooks/useAffiliationEntities';

interface AffiliationsSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
}

export const AffiliationsSection = ({ control, errors }: AffiliationsSectionProps) => {
  const {
    epsOptions,
    afpOptions,
    arlOptions,
    compensationOptions,
    tipoCotizanteOptions,
    subtipoCotizanteOptions,
    isLoading
  } = useAffiliationEntities();

  const regimenSaludOptions = [
    { value: 'contributivo', label: 'Contributivo' },
    { value: 'subsidiado', label: 'Subsidiado' }
  ];

  const estadoAfiliacionOptions = [
    { value: 'completa', label: 'Completa' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'inconsistente', label: 'Inconsistente' }
  ];

  if (isLoading) {
    return (
      <div className="border-t border-gray-100 pt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Afiliaciones</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Cargando opciones de afiliación...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 pt-8">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Afiliaciones</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EPS */}
        <FormField
          name="eps"
          label="EPS"
          type="select"
          control={control}
          errors={errors}
          options={epsOptions}
          placeholder="Seleccionar EPS"
        />

        {/* AFP */}
        <FormField
          name="afp"
          label="AFP/Fondo de Pensiones"
          type="select"
          control={control}
          errors={errors}
          options={afpOptions}
          placeholder="Seleccionar AFP"
        />

        {/* ARL */}
        <FormField
          name="arl"
          label="ARL"
          type="select"
          control={control}
          errors={errors}
          options={arlOptions}
          placeholder="Seleccionar ARL"
        />

        {/* Caja de Compensación */}
        <FormField
          name="cajaCompensacion"
          label="Caja de Compensación"
          type="select"
          control={control}
          errors={errors}
          options={compensationOptions}
          placeholder="Seleccionar Caja de Compensación"
        />

        {/* Régimen de Salud */}
        <FormField
          name="regimenSalud"
          label="Régimen de Salud"
          type="select"
          control={control}
          errors={errors}
          options={regimenSaludOptions}
          required
        />

        {/* Estado de Afiliación */}
        <FormField
          name="estadoAfiliacion"
          label="Estado de Afiliación"
          type="select"
          control={control}
          errors={errors}
          options={estadoAfiliacionOptions}
          required
        />

        {/* Tipo Cotizante */}
        <FormField
          name="tipoCotizanteId"
          label="Tipo de Cotizante"
          type="select"
          control={control}
          errors={errors}
          options={tipoCotizanteOptions}
          placeholder="Seleccionar Tipo de Cotizante"
        />

        {/* Subtipo Cotizante */}
        <FormField
          name="subtipoCotizanteId"
          label="Subtipo de Cotizante"
          type="select"
          control={control}
          errors={errors}
          options={subtipoCotizanteOptions}
          placeholder="Seleccionar Subtipo de Cotizante"
        />
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información sobre Afiliaciones
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Complete la información de afiliaciones del empleado para asegurar el cumplimiento 
                de las obligaciones de seguridad social.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
