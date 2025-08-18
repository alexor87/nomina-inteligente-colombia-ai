
import React from 'react';
import { BenefitCalculatorBase } from './BenefitCalculatorBase';

export const InteresesCalculator = () => {
  // Período por defecto: año actual (enero - diciembre)
  const currentYear = new Date().getFullYear();
  const defaultPeriod = {
    start: `${currentYear}-01-01`,
    end: `${currentYear}-12-31`
  };

  return (
    <BenefitCalculatorBase
      benefitType="intereses_cesantias"
      title="Cálculo de Intereses de Cesantías"
      description="Los intereses de cesantías corresponden al 12% anual sobre el valor de las cesantías. Se calculan de forma proporcional según el tiempo."
      defaultPeriod={defaultPeriod}
    />
  );
};
