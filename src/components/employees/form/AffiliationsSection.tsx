
import { Control, FieldErrors } from 'react-hook-form';
import { FormField } from './FormField';
import { EmployeeFormData } from './types';

interface AffiliationsSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
}

export const AffiliationsSection = ({ control, errors }: AffiliationsSectionProps) => {
  const regimenSaludOptions = [
    { value: 'contributivo', label: 'Contributivo' },
    { value: 'subsidiado', label: 'Subsidiado' }
  ];

  const estadoAfiliacionOptions = [
    { value: 'completa', label: 'Completa' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'inconsistente', label: 'Inconsistente' }
  ];

  return (
    <div className="border-t border-gray-100 pt-8">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Afiliaciones</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EPS */}
        <FormField
          name="eps"
          label="EPS"
          type="text"
          control={control}
          errors={errors}
          placeholder="EPS del empleado"
        />

        {/* AFP */}
        <FormField
          name="afp"
          label="AFP/Fondo de Pensiones"
          type="text"
          control={control}
          errors={errors}
          placeholder="AFP del empleado"
        />

        {/* ARL */}
        <FormField
          name="arl"
          label="ARL"
          type="text"
          control={control}
          errors={errors}
          placeholder="ARL del empleado"
        />

        {/* Caja de Compensación */}
        <FormField
          name="cajaCompensacion"
          label="Caja de Compensación"
          type="text"
          control={control}
          errors={errors}
          placeholder="Caja de compensación"
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

        {/* Tipo Cotizante ID */}
        <FormField
          name="tipoCotizanteId"
          label="Tipo de Cotizante"
          type="text"
          control={control}
          errors={errors}
          placeholder="ID del tipo de cotizante"
        />

        {/* Subtipo Cotizante ID */}
        <FormField
          name="subtipoCotizanteId"
          label="Subtipo de Cotizante"
          type="text"
          control={control}
          errors={errors}
          placeholder="ID del subtipo de cotizante"
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
