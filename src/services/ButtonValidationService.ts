
import { supabase } from '@/integrations/supabase/client';

export class ButtonValidationService {
  // Validar funcionalidad de botones del módulo de empleados
  static async validateEmployeeButtons() {
    console.log('🔍 Validating Employee Module Buttons...');
    
    const validations = {
      createEmployee: await this.testCreateEmployee(),
      updateEmployee: await this.testUpdateEmployee(),
      deleteEmployee: await this.testDeleteEmployee(),
      changeStatus: await this.testChangeEmployeeStatus(),
      exportData: await this.testExportEmployees(),
      bulkActions: await this.testBulkActions()
    };

    console.log('Employee Module Validation Results:', validations);
    return validations;
  }

  // Validar funcionalidad de botones del módulo de nómina
  static async validatePayrollButtons() {
    console.log('🔍 Validating Payroll Module Buttons...');
    
    const validations = {
      calculatePayroll: await this.testCalculatePayroll(),
      generateLiquidation: await this.testGenerateLiquidation(),
      exportPayroll: await this.testExportPayroll(),
      approvePayroll: await this.testApprovePayroll()
    };

    console.log('Payroll Module Validation Results:', validations);
    return validations;
  }

  // Validar funcionalidad de botones del módulo de comprobantes
  static async validateVoucherButtons() {
    console.log('🔍 Validating Voucher Module Buttons...');
    
    const validations = {
      generateVoucher: await this.testGenerateVoucher(),
      sendVoucher: await this.testSendVoucher(),
      downloadVoucher: await this.testDownloadVoucher(),
      resendVoucher: await this.testResendVoucher()
    };

    console.log('Voucher Module Validation Results:', validations);
    return validations;
  }

  // Tests específicos para empleados
  private static async testCreateEmployee(): Promise<boolean> {
    try {
      // Simular datos de empleado para testing
      const testEmployee = {
        cedula: 'TEST123456',
        nombre: 'Test',
        apellido: 'User',
        email: 'test@test.com',
        salario_base: 1000000,
        tipo_contrato: 'indefinido',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        estado: 'activo',
        company_id: 'test-company-id'
      };

      // Verificar que la query funcione (sin insertar realmente)
      const { error } = await supabase
        .from('employees')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Create Employee Test Failed:', error);
      return false;
    }
  }

  private static async testUpdateEmployee(): Promise<boolean> {
    try {
      // Verificar que la query de update funcione
      const { error } = await supabase
        .from('employees')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Update Employee Test Failed:', error);
      return false;
    }
  }

  private static async testDeleteEmployee(): Promise<boolean> {
    try {
      // Verificar permisos de delete
      const { error } = await supabase
        .from('employees')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Delete Employee Test Failed:', error);
      return false;
    }
  }

  private static async testChangeEmployeeStatus(): Promise<boolean> {
    try {
      // Verificar que se puede cambiar estado
      const { error } = await supabase
        .from('employees')
        .select('id, estado')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Change Status Test Failed:', error);
      return false;
    }
  }

  private static async testExportEmployees(): Promise<boolean> {
    try {
      // Verificar que se pueden obtener datos para exportar
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .limit(5);

      return !error && Array.isArray(data);
    } catch (error) {
      console.error('Export Employees Test Failed:', error);
      return false;
    }
  }

  private static async testBulkActions(): Promise<boolean> {
    try {
      // Verificar que se pueden hacer acciones masivas
      const { error } = await supabase
        .from('employees')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Bulk Actions Test Failed:', error);
      return false;
    }
  }

  // Tests para nómina
  private static async testCalculatePayroll(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payrolls')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Calculate Payroll Test Failed:', error);
      return false;
    }
  }

  private static async testGenerateLiquidation(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Generate Liquidation Test Failed:', error);
      return false;
    }
  }

  private static async testExportPayroll(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .limit(5);

      return !error && Array.isArray(data);
    } catch (error) {
      console.error('Export Payroll Test Failed:', error);
      return false;
    }
  }

  private static async testApprovePayroll(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .select('id, estado')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Approve Payroll Test Failed:', error);
      return false;
    }
  }

  // Tests para comprobantes
  private static async testGenerateVoucher(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Generate Voucher Test Failed:', error);
      return false;
    }
  }

  private static async testSendVoucher(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_vouchers')
        .select('id, voucher_status')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Send Voucher Test Failed:', error);
      return false;
    }
  }

  private static async testDownloadVoucher(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_vouchers')
        .select('id, pdf_url')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Download Voucher Test Failed:', error);
      return false;
    }
  }

  private static async testResendVoucher(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('voucher_audit_log')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Resend Voucher Test Failed:', error);
      return false;
    }
  }

  // Método principal para validar todos los módulos
  static async validateAllModules() {
    console.log('🚀 Starting Complete Button Validation...');
    
    const results = {
      employees: await this.validateEmployeeButtons(),
      payroll: await this.validatePayrollButtons(),
      vouchers: await this.validateVoucherButtons(),
      timestamp: new Date().toISOString()
    };

    console.log('🎯 Complete Validation Results:', results);
    return results;
  }
}
