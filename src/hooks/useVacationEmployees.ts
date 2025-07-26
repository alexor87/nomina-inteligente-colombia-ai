
import { useSecureVacationEmployees } from './useSecureQuery';

/**
 * 🔒 SECURITY MIGRATED: Now uses secure query with automatic company_id filtering
 * @deprecated Use useSecureVacationEmployees directly for better security
 */
export const useVacationEmployees = (enabled: boolean = true) => {
  return useSecureVacationEmployees(enabled);
};
