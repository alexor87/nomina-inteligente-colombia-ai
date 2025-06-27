
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { SecurityEntitiesSection } from './SecurityEntitiesSection';
import { CotizanteTypeSection } from './CotizanteTypeSection';
import { HealthRegimeSection } from './HealthRegimeSection';

interface AffiliationsSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  epsEntities: any[];
  afpEntities: any[];
  arlEntities: any[];
  compensationFunds: any[];
  tiposCotizante: any[];
  subtiposCotizante: any[];
  isLoadingTipos: boolean;
  isLoadingSubtipos: boolean;
  tiposError: string | null;
  handleTipoCotizanteChange: (tipoCotizanteId: string) => void;
}

export const AffiliationsSection = ({ 
  control, 
  errors, 
  watchedValues, 
  setValue, 
  watch,
  epsEntities,
  afpEntities,
  arlEntities,
  compensationFunds,
  tiposCotizante,
  subtiposCotizante,
  isLoadingTipos,
  isLoadingSubtipos,
  tiposError,
  handleTipoCotizanteChange
}: AffiliationsSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="pt-6">
        <h2 className="text-base font-medium text-gray-900 mb-4">Afiliaciones</h2>
        
        {tiposError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{tiposError}</p>
          </div>
        )}
        
        <div className="space-y-6">
          {/* Security Entities */}
          <SecurityEntitiesSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            epsEntities={epsEntities}
            afpEntities={afpEntities}
            arlEntities={arlEntities}
            compensationFunds={compensationFunds}
          />

          {/* Cotizante Types */}
          <CotizanteTypeSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            tiposCotizante={tiposCotizante}
            subtiposCotizante={subtiposCotizante}
            isLoadingTipos={isLoadingTipos}
            isLoadingSubtipos={isLoadingSubtipos}
            handleTipoCotizanteChange={handleTipoCotizanteChange}
          />

          {/* Health Regime and Affiliation Status */}
          <HealthRegimeSection
            control={control}
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
};
