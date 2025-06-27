
import { useEffect, useState, useRef } from 'react';
import { Employee } from '@/types';
import { useEmployeeGlobalConfiguration } from '@/hooks/useEmployeeGlobalConfiguration';
import { useEmployeeFormSubmission } from '@/hooks/useEmployeeFormSubmission';

// Import refactored components
import { NavigationSidebar } from './form/NavigationSidebar';
import { EmployeeFormHeader } from './form/EmployeeFormHeader';
import { EmployeeFormContent } from './form/EmployeeFormContent';
import { EmployeeFormFooter } from './form/EmployeeFormFooter';
import { useEmployeeForm } from './form/useEmployeeForm';

interface EmployeeFormModernProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
  onDataRefresh?: (updatedEmployee: Employee) => void;
}

export const EmployeeFormModern = ({ employee, onSuccess, onCancel, onDataRefresh }: EmployeeFormModernProps) => {
  console.log('🔄 EmployeeFormModern: Component rendered/re-rendered');
  console.log('🔄 EmployeeFormModern: Received employee prop:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'undefined');
  
  // Local state to handle employee data updates
  const [currentEmployee, setCurrentEmployee] = useState<Employee | undefined>(employee);
  
  // Sidebar state - collapsed by default
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const { configuration } = useEmployeeGlobalConfiguration();
  
  const {
    register,
    handleSubmit,
    errors,
    setValue,
    watch,
    trigger,
    reset,
    control,
    watchedValues,
    companyId,
    activeSection,
    completionPercentage,
    isDraft,
    arlRiskLevels,
    setActiveSection,
    setIsDraft,
    scrollToSection
  } = useEmployeeForm(currentEmployee);

  // Handle click outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !sidebarCollapsed
      ) {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarCollapsed]);

  // Handle data refresh callback
  const handleDataRefresh = (updatedEmployee: Employee) => {
    console.log('🔄 EmployeeFormModern: Received updated employee data from submission:', updatedEmployee);
    
    // Update local state
    setCurrentEmployee(updatedEmployee);
    
    // Notify parent component
    onDataRefresh?.(updatedEmployee);
  };

  const { handleSubmit: handleFormSubmission, isLoading } = useEmployeeFormSubmission(
    currentEmployee, 
    onSuccess, 
    handleDataRefresh
  );

  // CRITICAL: Update currentEmployee when employee prop changes (including on initial load)
  useEffect(() => {
    console.log('🔄 EmployeeFormModern: Employee prop changed effect triggered');
    console.log('📊 Previous employee:', currentEmployee ? `${currentEmployee.nombre} ${currentEmployee.apellido}` : 'undefined');
    console.log('📊 New employee:', employee ? `${employee.nombre} ${employee.apellido}` : 'undefined');
    
    if (employee) {
      console.log('📋 CRITICAL: Employee data for form:', {
        id: employee.id,
        nombre: employee.nombre,
        apellido: employee.apellido,
        updatedAt: employee.updatedAt
      });
      
      // Only update if it's actually a different employee or if data has changed
      const shouldUpdate = !currentEmployee || 
                          currentEmployee.id !== employee.id || 
                          currentEmployee.updatedAt !== employee.updatedAt;
      
      if (shouldUpdate) {
        console.log('✅ EmployeeFormModern: Updating currentEmployee state');
        setCurrentEmployee(employee);
      } else {
        console.log('⚠️ EmployeeFormModern: No update needed, employee data is the same');
      }
    }
  }, [employee?.id, employee?.updatedAt, employee]); // Enhanced dependency array

  const onSubmit = async (data: any) => {
    if (!companyId) return;
    console.log('🚀 EmployeeFormModern: Form submission triggered with data:', data);
    await handleFormSubmission(data, companyId, []);
  };

  const handleDuplicate = () => {
    console.log('Duplicating employee...');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  console.log('🎯 EmployeeFormModern: Rendering form with currentEmployee:', {
    id: currentEmployee?.id,
    name: currentEmployee ? `${currentEmployee.nombre} ${currentEmployee.apellido}` : 'undefined'
  });

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar with ref for click outside detection */}
      <div ref={sidebarRef}>
        <NavigationSidebar 
          activeSection={activeSection}
          completionPercentage={completionPercentage}
          scrollToSection={scrollToSection}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>
      
      {/* Main content with dynamic margin based on sidebar state */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-72'}`}>
        <EmployeeFormHeader
          employee={currentEmployee}
          onCancel={onCancel}
          onDuplicate={handleDuplicate}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <EmployeeFormContent
            control={control}
            errors={errors}
            watchedValues={watchedValues}
            setValue={setValue}
            watch={watch}
            arlRiskLevels={arlRiskLevels}
            register={register}
            configuration={configuration}
          />
        </form>

        <EmployeeFormFooter
          employee={currentEmployee}
          completionPercentage={completionPercentage}
          isDraft={isDraft}
          setIsDraft={setIsDraft}
          isLoading={isLoading}
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>

      {/* Overlay for mobile/tablet when sidebar is open */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};
