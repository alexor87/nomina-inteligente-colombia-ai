/**
 * @deprecated Re-export stub - use useEmployeeFormSubmission directly
 */
import { useEmployeeFormSubmission } from './useEmployeeFormSubmission';

export const useEmployeeFormSubmissionRobust = () => {
  const { submitEmployeeForm, isSubmitting } = useEmployeeFormSubmission();
  return {
    submitEmployee: (formData: any) => submitEmployeeForm(formData, formData.company_id || formData.empresaId),
    submitEmployeeForm,
    isSubmitting,
  };
};
