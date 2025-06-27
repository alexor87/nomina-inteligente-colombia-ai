
import { useState, useCallback } from 'react';

export const useEmployeeSelection = () => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }, []);

  const toggleAllEmployees = useCallback((employeeIds: string[]) => {
    setSelectedEmployees(prev => {
      const allSelected = employeeIds.every(id => prev.includes(id));
      return allSelected ? [] : employeeIds;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEmployees([]);
  }, []);

  return {
    selectedEmployees,
    toggleEmployeeSelection,
    toggleAllEmployees,
    clearSelection
  };
};
