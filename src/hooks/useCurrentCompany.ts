
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCurrentCompany = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getCurrentCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile:', error);
          setIsLoading(false);
          return;
        }

        setCompanyId(profile?.company_id || null);
      } catch (error) {
        console.error('Error getting current company:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentCompany();
  }, []);

  return { companyId, isLoading };
};
