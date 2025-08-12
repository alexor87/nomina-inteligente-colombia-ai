
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompanyRegistrationData {
  // Información básica de la empresa
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyAddress?: string;
  
  // Company data
  identificationType: 'NIT' | 'CC' | 'CE';
  identificationNumber: string;
  verificationDigit: string;
  industry: string;
  ciiuCode: string;
  employeeCount: string;
  payrollFrequency: 'quincenal' | 'mensual';
  
  // User data
  functionalArea: string;
  
  // Team invitation
  invitedMember?: {
    role: string;
    name: string;
    email: string;
  };
}

interface CompanyRegistrationStore {
  data: Partial<CompanyRegistrationData>;
  updateData: (newData: Partial<CompanyRegistrationData>) => void;
  clearStore: () => void;
}

export const useCompanyRegistrationStore = create<CompanyRegistrationStore>()(
  persist(
    (set) => ({
      data: {},
      updateData: (newData) => set((state) => ({ 
        data: { ...state.data, ...newData } 
      })),
      clearStore: () => set({ data: {} }),
    }),
    {
      name: 'company-registration-store',
    }
  )
);
