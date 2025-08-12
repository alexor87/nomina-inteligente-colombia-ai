
import { useState, useMemo } from 'react';
import { colombianDepartments, Department, Municipality } from '@/data/colombianGeography';

export const useColombianGeography = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Get all departments for dropdown
  const departments = useMemo(() => 
    colombianDepartments.map(dept => ({
      value: dept.name,
      label: dept.name,
      code: dept.code
    }))
  , []);

  // Get municipalities for selected department
  const municipalities = useMemo(() => {
    if (!selectedDepartment) return [];
    
    const department = colombianDepartments.find(dept => dept.name === selectedDepartment);
    if (!department) return [];

    return department.municipalities.map(muni => ({
      value: muni.name,
      label: muni.name,
      code: muni.code
    }));
  }, [selectedDepartment]);

  // Helper to get department by name
  const getDepartmentByName = (name: string): Department | undefined => {
    return colombianDepartments.find(dept => dept.name === name);
  };

  // Helper to get municipality by department and municipality name
  const getMunicipalityByName = (departmentName: string, municipalityName: string): Municipality | undefined => {
    const department = getDepartmentByName(departmentName);
    return department?.municipalities.find(muni => muni.name === municipalityName);
  };

  return {
    departments,
    municipalities,
    selectedDepartment,
    setSelectedDepartment,
    getDepartmentByName,
    getMunicipalityByName
  };
};
