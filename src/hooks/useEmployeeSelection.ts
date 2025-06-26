
import { useState } from 'react';

export const useEmployeeSelection = () => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAllEmployees = (currentPageEmployeeIds: string[]) => {
    const allCurrentPageSelected = currentPageEmployeeIds.every(id => selectedEmployees.includes(id));
    
    if (allCurrentPageSelected) {
      setSelectedEmployees(prev => prev.filter(id => !currentPageEmployeeIds.includes(id)));
    } else {
      setSelectedEmployees(prev => {
        const newSelected = [...prev];
        currentPageEmployeeIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  const bulkUpdateStatus = (newStatus: string) => {
    console.log(`Actualizando estado de ${selectedEmployees.length} empleados a: ${newStatus}`);
    setSelectedEmployees([]);
  };

  const exportEmployees = (format: 'excel' | 'pdf') => {
    console.log(`Exportando empleados en formato: ${format}`);
  };

  return {
    selectedEmployees,
    toggleEmployeeSelection,
    toggleAllEmployees,
    bulkUpdateStatus,
    exportEmployees
  };
};
