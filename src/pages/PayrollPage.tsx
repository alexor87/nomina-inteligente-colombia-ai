
import React from 'react';
import { PayrollLiquidationNew } from '@/components/payroll/PayrollLiquidationNew';
import { usePeriodsAutoCorrection } from '@/hooks/usePeriodsAutoCorrection';

const PayrollPage = () => {
  // **NUEVO**: Integración del sistema de auto-corrección universal
  const { correctionsMade, periodsFixed } = usePeriodsAutoCorrection();

  // Log silencioso para debugging
  React.useEffect(() => {
    if (correctionsMade > 0) {
      console.log(`✅ PÁGINA NÓMINA: Auto-corrección completada - ${correctionsMade} período(s) corregido(s):`, periodsFixed);
    }
  }, [correctionsMade, periodsFixed]);

  return <PayrollLiquidationNew />;
};

export default PayrollPage;
