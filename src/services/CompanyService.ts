
import { CompanyRegistrationService, CompanyRegistrationData, CompanyRegistrationWithUser } from './CompanyRegistrationService';
import { CompanyManagementService, Company } from './CompanyManagementService';
import { CompanyTestingService } from './CompanyTestingService';

// Re-export types for backward compatibility
export type { Company, CompanyRegistrationData, CompanyRegistrationWithUser };

// Main CompanyService acts as a facade
export class CompanyService {
  // Registration methods
  static async createCompanyWithUser(data: CompanyRegistrationWithUser): Promise<string> {
    return CompanyRegistrationService.createCompanyWithUser(data);
  }

  static async createCompany(data: CompanyRegistrationData): Promise<string> {
    return CompanyRegistrationService.createCompany(data);
  }

  // Management methods
  static async isSaasAdmin(): Promise<boolean> {
    return CompanyManagementService.isSaasAdmin();
  }

  static async getAllCompanies(): Promise<Company[]> {
    return CompanyManagementService.getAllCompanies();
  }

  static async getCurrentCompany(): Promise<Company | null> {
    return CompanyManagementService.getCurrentCompany();
  }

  static async updateCompany(companyId: string, updates: Partial<Company>): Promise<void> {
    return CompanyManagementService.updateCompany(companyId, updates);
  }

  static async suspendCompany(companyId: string): Promise<void> {
    return CompanyManagementService.suspendCompany(companyId);
  }

  static async activateCompany(companyId: string): Promise<void> {
    return CompanyManagementService.activateCompany(companyId);
  }

  // Testing methods
  static async testRpcConnection(): Promise<boolean> {
    return CompanyTestingService.testRpcConnection();
  }
}
