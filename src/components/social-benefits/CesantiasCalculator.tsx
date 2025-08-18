
import React from 'react';
import { BenefitCalculatorBase } from './BenefitCalculatorBase';

export const CesantiasCalculator = () => {
  // Período por defecto: año actual (enero - diciembre)
  const currentYear = new Date().getFullYear();
  const defaultPeriod = {
    start: `${currentYear}-01-01`,
    end: `${currentYear}-12-31`
  };

  return (
    <BenefitCalculatorBase
      benefitType="cesantias"
      title="Cálculo de Cesantías"
      description="Las cesantías equivalen a un mes de salario por cada año de trabajo. Se calculan de forma proporcional según el tiempo laborado."
      defaultPeriod={defaultPeriod}
    />
  );
};
