
import { useState, useEffect } from 'react';
import { ConfigurationService } from '@/services/ConfigurationService';

const DEFAULT_ARL_RISK_LEVELS = [
  { value: 'I', label: 'Nivel I - Riesgo Mínimo', percentage: '0.522%' },
  { value: 'II', label: 'Nivel II - Riesgo Bajo', percentage: '1.044%' },
  { value: 'III', label: 'Nivel III - Riesgo Medio', percentage: '2.436%' },
  { value: 'IV', label: 'Nivel IV - Riesgo Alto', percentage: '4.350%' },
  { value: 'V', label: 'Nivel V - Riesgo Máximo', percentage: '6.960%' }
];

export const useARLRiskLevels = () => {
  const [arlRiskLevels, setArlRiskLevels] = useState(DEFAULT_ARL_RISK_LEVELS);

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const config = await ConfigurationService.getConfiguration();
        
        if (config && config.arlRiskLevels) {
          const levels = [
            { value: 'I', label: 'Nivel I - Riesgo Mínimo', percentage: `${config.arlRiskLevels.I || 0.522}%` },
            { value: 'II', label: 'Nivel II - Riesgo Bajo', percentage: `${config.arlRiskLevels.II || 1.044}%` },
            { value: 'III', label: 'Nivel III - Riesgo Medio', percentage: `${config.arlRiskLevels.III || 2.436}%` },
            { value: 'IV', label: 'Nivel IV - Riesgo Alto', percentage: `${config.arlRiskLevels.IV || 4.350}%` },
            { value: 'V', label: 'Nivel V - Riesgo Máximo', percentage: `${config.arlRiskLevels.V || 6.960}%` }
          ];
          setArlRiskLevels(levels);
        } else {
          console.warn('Configuration or arlRiskLevels not available, using defaults');
          setArlRiskLevels(DEFAULT_ARL_RISK_LEVELS);
        }
      } catch (error) {
        console.error('Error loading ARL risk levels configuration:', error);
        setArlRiskLevels(DEFAULT_ARL_RISK_LEVELS);
      }
    };

    loadConfiguration();
  }, []);

  return { arlRiskLevels };
};
