
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEntity {
  id: string;
  code: string;
  name: string;
  status: string;
}

export const useSecurityEntities = () => {
  const [epsEntities, setEpsEntities] = useState<SecurityEntity[]>([]);
  const [afpEntities, setAfpEntities] = useState<SecurityEntity[]>([]);
  const [arlEntities, setArlEntities] = useState<SecurityEntity[]>([]);
  const [compensationFunds, setCompensationFunds] = useState<SecurityEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntities = async () => {
      setIsLoading(true);
      try {
        const [epsResponse, afpResponse, arlResponse, compensationResponse] = await Promise.all([
          supabase.from('eps_entities').select('*').eq('status', 'active').order('name'),
          supabase.from('afp_entities').select('*').eq('status', 'active').order('name'),
          supabase.from('arl_entities').select('*').eq('status', 'active').order('name'),
          supabase.from('compensation_funds').select('*').eq('status', 'active').order('name')
        ]);

        if (epsResponse.data) setEpsEntities(epsResponse.data);
        if (afpResponse.data) setAfpEntities(afpResponse.data);
        if (arlResponse.data) setArlEntities(arlResponse.data);
        if (compensationResponse.data) setCompensationFunds(compensationResponse.data);
      } catch (error) {
        console.error('Error fetching security entities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntities();
  }, []);

  return {
    epsEntities,
    afpEntities,
    arlEntities,
    compensationFunds,
    isLoading
  };
};
