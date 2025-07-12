
import { useState, useCallback } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataService } from '@/services/EmployeeDataService';
import { EmployeeTransformationService } from '@/services/EmployeeTransformationService';

export const useEmployeeLoader = () => {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 useEmployeeLoader: Starting to load employees...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const supportCompanyId = urlParams.get('support_company');
      
      let companyId: string;
      
      if (supportCompanyId) {
        companyId = supportCompanyId;
        console.log('🔧 Using support company context:', companyId);
      } else {
        try {
          companyId = await EmployeeDataService.getCurrentUserCompanyId();
          if (!companyId) {
            throw new Error('No se pudo obtener la empresa del usuario');
          }
        } catch (error) {
          console.error('❌ Error getting company ID:', error);
          toast({
            title: "Error de configuración",
            description: "No se pudo obtener la información de la empresa. Por favor, contacta al soporte.",
            variant: "destructive"
          });
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }
      }
      
      const rawData = await EmployeeDataService.getEmployees(companyId);
      console.log('📋 Raw employee data from database:', rawData);
      
      // Transform raw employee data to EmployeeWithStatus format
      const transformedData = EmployeeTransformationService.transformEmployeeData(rawData);
      
      console.log('✅ All employees transformed, total:', transformedData.length);
      setEmployees(transformedData);
      setIsInitialized(true);
      
      if (supportCompanyId) {
        toast({
          title: "Modo Soporte Activo",
          description: `Viendo empleados de empresa en contexto de soporte`,
        });
      }
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados. Verifica tu conexión e intenta nuevamente.",
        variant: "destructive"
      });
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    employees,
    setEmployees,
    isLoading,
    isInitialized,
    loadEmployees
  };
};
