
import React from 'react';
import { BenefitCalculatorBase } from './BenefitCalculatorBase';

export const PrimaCalculator = () => {
  // Determinar período semestral actual
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() es 0-indexado
  
  // Si estamos en el primer semestre (enero-junio), mostrar período enero-junio
  // Si estamos en el segundo semestre (julio-diciembre), mostrar período julio-diciembre
  const defaultPeriod = currentMonth <= 6 
    ? {
        start: `${currentYear}-01-01`,
        end: `${currentYear}-06-30`
      }
    : {
        start: `${currentYear}-07-01`,
        end: `${currentYear}-12-31`
      };

  return (
    <BenefitCalculatorBase
      benefitType="prima"
      title="Cálculo de Prima de Servicios"
      description="La prima de servicios se paga semestralmente (junio y diciembre) y equivale a 15 días de salario por semestre completo trabajado."
      defaultPeriod={defaultPeriod}
    />
  );
};
