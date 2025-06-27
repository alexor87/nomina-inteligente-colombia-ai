
import { usePagination } from '@/hooks/usePagination';
import { useEmployeeData } from './useEmployeeData';
import { useEmployeeFiltering } from './useEmployeeFiltering';
import { useEmployeeSelection } from './useEmployeeSelection';
import { useEmployeeModal } from './useEmployeeModal';
import { useEmployeeCompliance } from './useEmployeeCompliance';

export const useEmployeeList = () => {
  const { employees: allEmployees, isLoading, refreshEmployees, findEmployeeById } = useEmployeeData();
  const { filters, filteredEmployees, updateFilters, clearFilters } = useEmployeeFiltering(allEmployees);
  const { selectedEmployees, toggleEmployeeSelection, toggleAllEmployees, clearSelection, exportEmployees } = useEmployeeSelection();
  const { selectedEmployee, isEmployeeProfileOpen, openEmployeeProfile, closeEmployeeProfile } = useEmployeeModal();
  const { getComplianceIndicators } = useEmployeeCompliance();

  const pagination = usePagination(filteredEmployees, {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 75, 100],
    storageKey: 'employees'
  });

  return {
    employees: pagination.paginatedItems, // Return paginated employees for list display
    allEmployees: filteredEmployees, // Keep reference to all filtered employees
    rawEmployees: allEmployees, // NEW: All employees without any filters or pagination
    filters,
    selectedEmployees,
    isLoading,
    selectedEmployee,
    isEmployeeProfileOpen,
    pagination, // Export pagination object
    updateFilters,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees: () => toggleAllEmployees(pagination.paginatedItems.map(emp => emp.id)),
    clearSelection,
    exportEmployees,
    getComplianceIndicators,
    openEmployeeProfile,
    closeEmployeeProfile,
    totalEmployees: allEmployees.length,
    filteredCount: filteredEmployees.length,
    refreshEmployees,
    findEmployeeById // NEW: Direct employee search function
  };
};
