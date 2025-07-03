
import React from 'react';
import { PayrollLiquidationNew } from '@/components/payroll/PayrollLiquidationNew';
import { usePeriodsAutoCorrection } from '@/hooks/usePeriodsAutoCorrection';

const PayrollPage = () => {
  // **INTEGRACIÓN UNIVERSAL**: Sistema de auto-corrección que funciona en TODAS las páginas
  const { correctionsMade, periodsFixed } = usePeriodsAutoCorrection();

  // Log silencioso para debugging - El usuario no ve esto, es para troubleshooting
  React.useEffect(() => {
    if (correctionsMade > 0) {
      console.log(`✅ PÁGINA LIQUIDACIÓN: Auto-corrección completada - ${correctionsMade} período(s) corregido(s):`, periodsFixed);
    }
  }, [correctionsMade, periodsFixed]);

  return <PayrollLiquidationNew />;
};

export default PayrollPage;
