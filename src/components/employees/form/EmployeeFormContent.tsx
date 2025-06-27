import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { PersonalInfoSection } from './PersonalInfoSection';
import { LaborInfoSection } from './LaborInfoSection';
import { BankingInfoSection } from './BankingInfoSection';
import { AffiliationsSection } from './AffiliationsSection';
import { EmployeeFormData } from './types';

interface EmployeeFormContentProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: any;
  epsEntities: any[];
  afpEntities: any[];
  arlEntities: any[];
  compensationFunds: any[];
  tiposCotizante: any[];
  subtiposCotizante: any[];
  isLoadingTipos: boolean;
  isLoadingSubtipos: boolean;
  tiposError: any;
  handleTipoCotizanteChange: (tipoCotizanteId: string) => Promise<void>;
  configuration: any;
}

export const EmployeeFormContent = ({
  control,
  errors,
  watchedValues,
  setValue,
  watch,
  arlRiskLevels,
  register,
  epsEntities,
  afpEntities,
  arlEntities,
  compensationFunds,
  tiposCotizante,
  subtiposCotizante,
  isLoadingTipos,
  isLoadingSubtipos,
  tiposError,
  handleTipoCotizanteChange,
  configuration
}: EmployeeFormContentProps) => {
  return (
    <div className="p-8 max-w-4xl">
      <div className="space-y-0">
        {/* Personal Information Section */}
        <div id="section-personal">
          <PersonalInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            watch={watch}
          />
        </div>

        {/* Labor Information Section */}
        <div id="section-laboral">
          <LaborInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            arlRiskLevels={arlRiskLevels}
            register={register}
          />
        </div>

        {/* Banking Information Section */}
        <div id="section-bancaria">
          <BankingInfoSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            register={register}
          />
        </div>

        {/* Affiliations Section */}
        <div id="section-afiliaciones">
          <AffiliationsSection
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            epsEntities={epsEntities}
            afpEntities={afpEntities}
            arlEntities={arlEntities}
            compensationFunds={compensationFunds}
            tiposCotizante={tiposCotizante}
            subtiposCotizante={subtiposCotizante}
            isLoadingTipos={isLoadingTipos}
            isLoadingSubtipos={isLoadingSubtipos}
            tiposError={tiposError}
            handleTipoCotizanteChange={handleTipoCotizanteChange}
          />
        </div>

        {/* Custom Fields Section - Only if configured */}
        {configuration.customFields.length > 0 && (
          <div id="section-personalizados">
            {/* Custom fields implementation would go here */}
          </div>
        )}
      </div>
    </div>
  );
};
