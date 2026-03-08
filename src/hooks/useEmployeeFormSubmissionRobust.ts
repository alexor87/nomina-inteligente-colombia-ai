/**
 * @deprecated Re-export stub - use useEmployeeFormSubmission directly
 */
import { useEmployeeFormSubmission } from './useEmployeeFormSubmission';

export const useEmployeeFormSubmissionRobust = () => {
  const { submitEmployeeForm, isSubmitting } = useEmployeeFormSubmission();
  return {
    submitEmployee: submitEmployeeForm,
    submitEmployeeForm,
    isSubmitting,
  };
};
