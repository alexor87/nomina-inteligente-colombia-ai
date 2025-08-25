
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCurrentCompany = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentUserCompany = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_company_id');
        
        if (error) {
          console.error('Error getting current user company:', error);
          return;
        }
        
        setCompanyId(data);
      } catch (error) {
        console.error('Error in getCurrentUserCompany:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUserCompany();
  }, []);

  return { companyId, loading };
};
