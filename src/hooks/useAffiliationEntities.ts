
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Entity {
  code: string;
  name: string;
}

interface TipoCotizante {
  id: string;
  nombre: string;
}

interface SubtipoCotizante {
  id: string;
  nombre: string;
  tipo_cotizante_id: string;
}

export const useAffiliationEntities = () => {
  const [epsEntities, setEpsEntities] = useState<Entity[]>([]);
  const [afpEntities, setAfpEntities] = useState<Entity[]>([]);
  const [arlEntities, setArlEntities] = useState<Entity[]>([]);
  const [compensationFunds, setCompensationFunds] = useState<Entity[]>([]);
  const [tiposCotizante, setTiposCotizante] = useState<TipoCotizante[]>([]);
  const [subtiposCotizante, setSubtiposCotizante] = useState<SubtipoCotizante[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [
          epsResponse,
          afpResponse,
          arlResponse,
          compensationResponse,
          tiposResponse,
          subtiposResponse
        ] = await Promise.all([
          supabase.from('eps_entities').select('code, name').eq('status', 'active'),
          supabase.from('afp_entities').select('code, name').eq('status', 'active'),
          supabase.from('arl_entities').select('code, name').eq('status', 'active'),
          supabase.from('compensation_funds').select('code, name').eq('status', 'active'),
          supabase.from('tipos_cotizante').select('id, nombre'),
          supabase.from('subtipos_cotizante').select('id, nombre, tipo_cotizante_id')
        ]);

        if (epsResponse.data) setEpsEntities(epsResponse.data);
        if (afpResponse.data) setAfpEntities(afpResponse.data);
        if (arlResponse.data) setArlEntities(arlResponse.data);
        if (compensationResponse.data) setCompensationFunds(compensationResponse.data);
        if (tiposResponse.data) setTiposCotizante(tiposResponse.data);
        if (subtiposResponse.data) setSubtiposCotizante(subtiposResponse.data);
      } catch (error) {
        console.error('Error fetching affiliation entities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntities();
  }, []);

  // Convert to dropdown options format
  const epsOptions = epsEntities.map(entity => ({
    value: entity.name,
    label: entity.name
  }));

  const afpOptions = afpEntities.map(entity => ({
    value: entity.name,
    label: entity.name
  }));

  const arlOptions = arlEntities.map(entity => ({
    value: entity.name,
    label: entity.name
  }));

  const compensationOptions = compensationFunds.map(entity => ({
    value: entity.name,
    label: entity.name
  }));

  const tipoCotizanteOptions = tiposCotizante.map(tipo => ({
    value: tipo.id,
    label: tipo.nombre
  }));

  const subtipoCotizanteOptions = subtiposCotizante.map(subtipo => ({
    value: subtipo.id,
    label: subtipo.nombre
  }));

  return {
    epsOptions,
    afpOptions,
    arlOptions,
    compensationOptions,
    tipoCotizanteOptions,
    subtipoCotizanteOptions,
    isLoading
  };
};
