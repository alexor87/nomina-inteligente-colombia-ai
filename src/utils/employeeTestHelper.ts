
import { EmployeeServiceRobust } from '@/services/EmployeeServiceRobust';
import { validateEmployeeData } from '@/schemas/employeeValidation';

export class EmployeeTestHelper {
  /**
   * Generate test employee data
   */
  static generateTestEmployeeData(overrides: any = {}) {
    const baseData = {
      cedula: '12345678',
      tipoDocumento: 'CC',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@test.com',
      telefono: '3001234567',
      salarioBase: 1300000,
      tipoContrato: 'indefinido',
      fechaIngreso: '2024-01-01',
      periodicidadPago: 'mensual',
      cargo: 'Desarrollador',
      estado: 'activo',
      sexo: 'M',
      tipoJornada: 'completa',
      diasTrabajo: 30,
      horasTrabajo: 8,
      tipoCuenta: 'ahorros',
      formaPago: 'dispersion',
      regimenSalud: 'contributivo',
      estadoAfiliacion: 'pendiente',
      beneficiosExtralegales: false,
      ...overrides
    };

    return baseData;
  }

  /**
   * Test employee validation
   */
  static testValidation() {
    console.group('🧪 Testing Employee Validation');
    
    // Test valid data
    const validData = this.generateTestEmployeeData();
    const validResult = validateEmployeeData(validData);
    console.log('✅ Valid data test:', validResult.success ? 'PASSED' : 'FAILED', validResult);

    // Test invalid data - missing required fields
    const invalidData = { nombre: 'Test' };
    const invalidResult = validateEmployeeData(invalidData);
    console.log('❌ Invalid data test:', !invalidResult.success ? 'PASSED' : 'FAILED', invalidResult);

    // Test invalid salary
    const lowSalaryData = this.generateTestEmployeeData({ salarioBase: 500000 });
    const lowSalaryResult = validateEmployeeData(lowSalaryData);
    console.log('💰 Low salary test:', !lowSalaryResult.success ? 'PASSED' : 'FAILED', lowSalaryResult);

    console.groupEnd();
  }

  /**
   * Test employee creation (mock)
   */
  static async testEmployeeCreation() {
    console.group('🧪 Testing Employee Creation Process');
    
    try {
      const testData = this.generateTestEmployeeData({
        cedula: `TEST${Date.now()}` // Unique cedula for testing
      });

      console.log('📝 Test data generated:', testData);
      
      // This would normally create an employee, but we'll just validate the process
      const validationResult = validateEmployeeData(testData);
      
      if (validationResult.success) {
        console.log('✅ Validation passed - ready for database insertion');
        console.log('📊 Validated data:', validationResult.data);
      } else {
        console.log('❌ Validation failed:', validationResult.errors);
      }

      console.groupEnd();
      return validationResult;
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Run all tests
   */
  static runAllTests() {
    console.log('🚀 Starting Employee System Tests');
    
    this.testValidation();
    
    // Note: Actual database tests would require authentication and proper setup
    console.log('ℹ️  Database tests require authentication - run in development with logged-in user');
    
    console.log('✅ All available tests completed');
  }
}

// Auto-run tests in development mode
if (process.env.NODE_ENV === 'development') {
  // Uncomment the line below to run tests automatically
  // EmployeeTestHelper.runAllTests();
}
