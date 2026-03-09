
import { useNavigate } from 'react-router-dom';
import { EmployeeFormModern } from '@/components/employees/EmployeeFormModern';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { UpgradePlanDialog } from '@/components/subscription/UpgradePlanDialog';
import { useEffect } from 'react';

const CreateEmployeeModernPage = () => {
  const navigate = useNavigate();
  const {
    canAddEmployee,
    isWriteBlocked,
    triggerUpgradePrompt,
    showUpgradeDialog,
    setShowUpgradeDialog,
    limitType,
    currentPlan,
    suggestedPlan,
    employeeCount,
    maxEmployees,
  } = useSubscriptionLimits();

  useEffect(() => {
    if (!canAddEmployee() || isWriteBlocked) {
      triggerUpgradePrompt('employees');
    }
  }, [canAddEmployee, isWriteBlocked]);

  const handleSuccess = () => {
    navigate('/modules/employees');
  };

  const handleCancel = () => {
    navigate('/modules/employees');
  };

  const blocked = !canAddEmployee() || isWriteBlocked;

  return (
    <>
      {blocked ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-semibold text-foreground">No es posible agregar empleados</h2>
            <p className="text-muted-foreground">
              {isWriteBlocked
                ? 'Tu período de prueba ha expirado. Contacta soporte para activar tu plan.'
                : `Has alcanzado el límite de ${maxEmployees} empleados en tu plan actual.`}
            </p>
          </div>
        </div>
      ) : (
        <EmployeeFormModern 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}

      <UpgradePlanDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType={limitType}
        currentPlan={currentPlan}
        suggestedPlan={suggestedPlan}
        currentCount={employeeCount}
        maxAllowed={maxEmployees}
      />
    </>
  );
};

export default CreateEmployeeModernPage;
