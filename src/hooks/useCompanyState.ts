
import { useState, useEffect } from 'react';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';

export const useCompanyState = () => {
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkCompanyState();
  }, []);

  const checkCompanyState = async () => {
    try {
      setIsLoading(true);
      
      const currentCompanyId = await PayrollHistoryService.getCurrentUserCompanyId();
      setCompanyId(currentCompanyId);
      
      if (!currentCompanyId) {
        setIsNewCompany(true);
        return;
      }

      // Verificar si la empresa tiene períodos de nómina
      const periods = await PayrollHistoryService.getPayrollPeriods();
      setIsNewCompany(periods.length === 0);
      
    } catch (error) {
      console.error('Error checking company state:', error);
      setIsNewCompany(true);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isNewCompany,
    companyId,
    isLoading,
    checkCompanyState
  };
};
