
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyInfo {
  id: string;
  razon_social: string;
}

export const useCompanyName = () => {
  const { profile, isSuperAdmin, roles } = useAuth();
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        setLoading(true);

        // Si es super admin, no necesitamos buscar empresa
        if (isSuperAdmin) {
          setCompanyName('Super Admin Panel');
          setLoading(false);
          return;
        }

        // Si no hay empresa asignada, usar nombre genérico
        if (!profile?.company_id) {
          setCompanyName('Nómina Inteligente');
          setLoading(false);
          return;
        }

        // Obtener el nombre real de la empresa
        const { data: company, error } = await supabase
          .from('companies')
          .select('id, razon_social')
          .eq('id', profile.company_id)
          .single();

        if (error) {
          console.error('Error fetching company name:', error);
          setCompanyName('Mi Empresa');
        } else {
          setCompanyName(company?.razon_social || 'Mi Empresa');
        }
      } catch (error) {
        console.error('Error in fetchCompanyName:', error);
        setCompanyName('Mi Empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyName();
  }, [profile?.company_id, isSuperAdmin]);

  return { companyName, loading };
};
