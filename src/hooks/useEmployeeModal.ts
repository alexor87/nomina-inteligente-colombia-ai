
import { useState } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';

export const useEmployeeModal = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStatus | null>(null);
  const [isEmployeeProfileOpen, setIsEmployeeProfileOpen] = useState(false);

  const openEmployeeProfile = (employee: EmployeeWithStatus) => {
    setSelectedEmployee(employee);
    setIsEmployeeProfileOpen(true);
  };

  const closeEmployeeProfile = () => {
    setIsEmployeeProfileOpen(false);
    setSelectedEmployee(null);
  };

  return {
    selectedEmployee,
    isEmployeeProfileOpen,
    openEmployeeProfile,
    closeEmployeeProfile
  };
};
