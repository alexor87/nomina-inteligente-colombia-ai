
import { useEffect } from 'react';
import { FieldErrors, FormState } from 'react-hook-form';

interface UseFormDebugProps {
  formState: FormState<any>;
  errors: FieldErrors;
  watchedValues: any;
  employee?: any;
}

export const useFormDebug = ({ formState, errors, watchedValues, employee }: UseFormDebugProps) => {
  useEffect(() => {
    console.log('🐛 FORM DEBUG - State changed:', {
      isValid: formState.isValid,
      isDirty: formState.isDirty,
      isSubmitting: formState.isSubmitting,
      isSubmitted: formState.isSubmitted,
      isSubmitSuccessful: formState.isSubmitSuccessful,
      submitCount: formState.submitCount,
      errorsCount: Object.keys(errors).length,
      errors: errors,
      hasEmployee: !!employee,
      employeeId: employee?.id
    });
  }, [formState, errors, employee]);

  useEffect(() => {
    console.log('🐛 WATCHED VALUES changed:', watchedValues);
  }, [watchedValues]);

  // Debug function to check form connectivity
  const debugFormConnectivity = () => {
    const form = document.querySelector('form');
    const buttons = document.querySelectorAll('button[type="button"], button[type="submit"]');
    
    console.log('🐛 FORM CONNECTIVITY DEBUG:', {
      formExists: !!form,
      formId: form?.id,
      formClass: form?.className,
      buttonsCount: buttons.length,
      buttons: Array.from(buttons).map(btn => ({
        type: btn.getAttribute('type'),
        disabled: btn.hasAttribute('disabled'),
        text: btn.textContent?.trim()
      }))
    });
  };

  return { debugFormConnectivity };
};
