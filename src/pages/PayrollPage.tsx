
import React from 'react';
import { useParams } from 'react-router-dom';
import { PayrollLiquidationNew } from '@/components/payroll/PayrollLiquidationNew';

const PayrollPage = () => {
  const { periodId } = useParams<{ periodId: string }>();

  // If no periodId is provided in URL, use a default or handle the case
  const defaultPeriodId = periodId || 'default-period-id';

  return (
    <div className="container mx-auto py-6">
      <PayrollLiquidationNew 
        periodId={defaultPeriodId}
        onCalculationComplete={() => {
          console.log('Calculation completed');
        }}
        onEmployeeSelect={(employeeId) => {
          console.log('Employee selected:', employeeId);
        }}
      />
    </div>
  );
};

export default PayrollPage;
