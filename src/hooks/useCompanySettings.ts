
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

interface CompanyData {
  // Información General
  razon_social: string;
  tipo_sociedad: string;
  nit: string;
  dv: string;
  email: string;
  telefono: string;
  logo_url: string;
  
  // Dirección y Ubicación
  direccion: string;
  ciudad: string;
  departamento: string;
  codigo_postal: string;
  pais: string;
  
  // Representante Legal
  representante_legal: string;
  representante_tipo_doc: string;
  representante_documento: string;
  representante_email: string;
  
  // Configuraciones de Nómina
  periodicidad: string;
  fecha_inicio_operacion: string;
  ultima_liquidacion: string;
  nomina_prueba: boolean;
  calculo_horas_extra: string;
  
  // Identificación Económica
  codigo_ciiu: string;
  nombre_ciiu: string;
  clase_riesgo_arl: string;
  tamano_empresa: string;
  actividad_economica: string;
}

export const useCompanySettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData>({
    // Información General
    razon_social: '',
    tipo_sociedad: '',
    nit: '',
    dv: '',
    email: '',
    telefono: '',
    logo_url: '',
    
    // Dirección y Ubicación
    direccion: '',
    ciudad: '',
    departamento: '',
    codigo_postal: '',
    pais: 'Colombia',
    
    // Representante Legal
    representante_legal: '',
    representante_tipo_doc: '',
    representante_documento: '',
    representante_email: '',
    
    // Configuraciones de Nómina
    periodicidad: 'mensual',
    fecha_inicio_operacion: '',
    ultima_liquidacion: '',
    nomina_prueba: false,
    calculo_horas_extra: 'manual',
    
    // Identificación Económica
    codigo_ciiu: '',
    nombre_ciiu: '',
    clase_riesgo_arl: '',
    tamano_empresa: '',
    actividad_economica: ''
  });

  const loadCompanyData = async () => {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        const company = await CompanyConfigurationService.getCompanyData(companyId);
        if (company) {
          // Separar NIT y DV si vienen juntos
          let nitPart = company.nit || '';
          let dvPart = '';
          
          if (nitPart.includes('-')) {
            const parts = nitPart.split('-');
            nitPart = parts[0];
            dvPart = parts[1] || '';
          }

          setCompanyData(prev => ({
            ...prev,
            razon_social: company.razon_social || '',
            nit: nitPart,
            dv: dvPart,
            email: company.email || '',
            telefono: company.telefono || '',
            direccion: company.direccion || '',
            ciudad: company.ciudad || '',
            departamento: company.departamento || '',
            representante_legal: company.representante_legal || '',
            actividad_economica: company.actividad_economica || '',
            logo_url: company.logo_url || ''
          }));
        }

        const config = await CompanyConfigurationService.getCompanyConfiguration(companyId);
        if (config) {
          setCompanyData(prev => ({
            ...prev,
            periodicidad: config.periodicity
          }));
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const handleInputChange = (field: keyof CompanyData, value: string | boolean) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields = ['razon_social', 'nit', 'email', 'direccion', 'ciudad', 'departamento', 'periodicidad'];
    const missingFields = requiredFields.filter(field => !companyData[field as keyof CompanyData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos obligatorios",
        description: `Por favor complete: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        toast({
          title: "❌ Error",
          description: "No se pudo identificar la empresa del usuario",
          variant: "destructive"
        });
        return;
      }

      // Construir NIT completo (con DV si existe)
      let nitCompleto = companyData.nit;
      if (companyData.dv) {
        nitCompleto = `${companyData.nit}-${companyData.dv}`;
      }

      // Update company basic data including logo and departamento
      await CompanyConfigurationService.updateCompanyData(companyId, {
        razon_social: companyData.razon_social,
        nit: nitCompleto,
        email: companyData.email,
        telefono: companyData.telefono,
        direccion: companyData.direccion,
        ciudad: companyData.ciudad,
        departamento: companyData.departamento,
        representante_legal: companyData.representante_legal,
        actividad_economica: companyData.actividad_economica,
        logo_url: companyData.logo_url
      });

      // Update company settings (periodicity)
      await CompanyConfigurationService.saveCompanyConfiguration(companyId, companyData.periodicidad);

      console.log('✅ Configuración guardada exitosamente');
      toast({
        title: "✅ Configuración guardada",
        description: "Los datos de la empresa han sido actualizados exitosamente",
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "❌ Error al guardar",
        description: "No se pudo guardar la configuración. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    companyData,
    isLoading,
    handleInputChange,
    handleSave,
    loadCompanyData
  };
};
