
import { useState, useCallback } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';

export const useEmployeeModal = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStatus | null>(null);
  const [isEmployeeProfileOpen, setIsEmployeeProfileOpen] = useState(false);

  const openEmployeeProfile = useCallback((employee: EmployeeWithStatus) => {
    setSelectedEmployee(employee);
    setIsEmployeeProfileOpen(true);
  }, []);

  const closeEmployeeProfile = useCallback(() => {
    setSelectedEmployee(null);
    setIsEmployeeProfileOpen(false);
  }, []);

  return {
    selectedEmployee,
    isEmployeeProfileOpen,
    openEmployeeProfile,
    closeEmployeeProfile
  };
};
