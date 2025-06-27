
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useRealtimeSettings } from '@/hooks/useRealtimeSettings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { CostCenterManagement } from './CostCenterManagement';
import { BranchManagement } from './BranchManagement';
import { GeneralInfoSection } from './company/GeneralInfoSection';
import { AddressSection } from './company/AddressSection';
import { LegalRepresentativeSection } from './company/LegalRepresentativeSection';
import { PayrollSettingsSection } from './company/PayrollSettingsSection';
import { EconomicIdentificationSection } from './company/EconomicIdentificationSection';

export const EmpresaSettings = () => {
  const {
    companyData,
    isLoading,
    handleInputChange,
    handleSave,
    loadCompanyData
  } = useCompanySettings();

  // Usar realtime para configuraciones
  useRealtimeSettings({
    onSettingsChange: () => {
      console.log('⚙️ Configuración actualizada desde realtime');
      loadCompanyData();
    }
  });

  useEffect(() => {
    loadCompanyData();
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Configuración de la Empresa</h2>
          <p className="text-gray-600">Configuración completa de la información empresarial y parámetros de nómina</p>
        </div>

        {/* Información General de la Empresa */}
        <GeneralInfoSection 
          companyData={companyData} 
          onInputChange={handleInputChange} 
        />

        {/* Dirección y Ubicación */}
        <AddressSection 
          companyData={companyData} 
          onInputChange={handleInputChange} 
        />

        {/* Representante Legal */}
        <LegalRepresentativeSection 
          companyData={companyData} 
          onInputChange={handleInputChange} 
        />

        {/* Configuraciones de Nómina */}
        <PayrollSettingsSection 
          companyData={companyData} 
          onInputChange={handleInputChange} 
        />

        {/* Identificación Económica */}
        <EconomicIdentificationSection 
          companyData={companyData} 
          onInputChange={handleInputChange} 
        />

        {/* Centros de Costo */}
        <CostCenterManagement />

        {/* Sucursales */}
        <BranchManagement />

        {/* Controles inferiores */}
        <Card className="p-6">
          <div className="flex gap-4 justify-between">
            <div className="flex gap-4">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
              <Button 
                onClick={loadCompanyData} 
                variant="outline"
              >
                Recargar Datos
              </Button>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              ℹ️ Los campos marcados con * son obligatorios. La configuración se aplica inmediatamente a todos los procesos de nómina.
            </p>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};
