import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyDetails {
  id: string;
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  representante_legal?: string;
  actividad_economica?: string;
}

export const useCompanyDetails = () => {
  const { profile } = useAuth();
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!profile?.company_id) {
          setCompanyDetails(null);
          setLoading(false);
          return;
        }

        const { data: company, error } = await supabase
          .from('companies')
          .select(`
            id,
            nit,
            razon_social,
            email,
            telefono,
            direccion,
            ciudad,
            representante_legal,
            actividad_economica
          `)
          .eq('id', profile.company_id)
          .single();

        if (error) {
          console.error('Error fetching company details:', error);
          setError('Error al cargar datos de la empresa');
          setCompanyDetails(null);
        } else {
          setCompanyDetails(company);
        }
      } catch (error) {
        console.error('Error in fetchCompanyDetails:', error);
        setError('Error inesperado al cargar datos de la empresa');
        setCompanyDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [profile?.company_id]);

  return { companyDetails, loading, error };
};