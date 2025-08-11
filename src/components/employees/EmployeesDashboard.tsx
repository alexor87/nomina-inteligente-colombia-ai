
import React from 'react';
import { EmployeeList } from './EmployeeList';

/**
 * Dashboard simplificado de empleados - solo lista
 */
export const EmployeesDashboard = () => {
  return (
    <div className="space-y-6">
      <EmployeeList />
    </div>
  );
};
