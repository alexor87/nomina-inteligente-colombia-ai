
import { EmployeeServiceRobust } from '@/services/EmployeeServiceRobust';
import { validateEmployeeData } from '@/schemas/employeeValidation';

export class EmployeeTestHelper {
  /**
   * Generate test employee data - Kelly Yohana Arias Roldan test case
   */
  static generateKellyTestData(overrides: any = {}) {
    const kellyData = {
      cedula: '52123456',
      tipoDocumento: 'CC',
      nombre: 'Kelly Yohana',
      apellido: 'Arias Roldan',
      email: 'kelly.arias@test.com',
      telefono: '3001234567',
      salarioBase: 2500000, // Ensure this is present and > minimum
      tipoContrato: 'indefinido',
      fechaIngreso: '2024-01-15', // Ensure this is present and properly formatted
      periodicidadPago: 'mensual',
      cargo: 'Analista de Sistemas',
      estado: 'activo',
      sexo: 'F',
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

    console.log('📋 Generated Kelly test data:', kellyData);
    return kellyData;
  }

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
   * Test employee validation with detailed debugging
   */
  static testValidation() {
    console.group('🧪 Testing Employee Validation with Kelly Data');
    
    // Test Kelly's data specifically
    const kellyData = this.generateKellyTestData();
    const kellyResult = validateEmployeeData(kellyData);
    console.log('✅ Kelly validation test:', kellyResult.success ? 'PASSED' : 'FAILED', kellyResult);

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
   * Test Kelly Yohana Arias Roldan creation specifically
   */
  static async testKellyCreation() {
    console.group('🧪 Testing Kelly Yohana Arias Roldan Creation');
    
    try {
      const kellyData = this.generateKellyTestData({
        cedula: `KELLY${Date.now()}` // Unique cedula for testing
      });

      console.log('📝 Kelly test data generated:', kellyData);
      
      // Step 1: Test validation
      const validationResult = validateEmployeeData(kellyData);
      
      if (validationResult.success) {
        console.log('✅ Kelly data validation passed');
        console.log('📊 Validated Kelly data:', validationResult.data);
        
        // Step 2: Test creation process (without actual database call)
        console.log('🔍 Would proceed to database creation with:');
        console.log('- salarioBase:', validationResult.data?.salarioBase);
        console.log('- fechaIngreso:', validationResult.data?.fechaIngreso);
        console.log('- All required fields present:', {
          cedula: validationResult.data?.cedula,
          nombre: validationResult.data?.nombre,
          apellido: validationResult.data?.apellido,
          salarioBase: validationResult.data?.salarioBase,
          fechaIngreso: validationResult.data?.fechaIngreso
        });
      } else {
        console.log('❌ Kelly data validation failed:', validationResult.errors);
      }

      console.groupEnd();
      return validationResult;
    } catch (error) {
      console.error('❌ Kelly test failed with error:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Run comprehensive tests
   */
  static runAllTests() {
    console.log('🚀 Starting Employee System Tests - Focus on Kelly Issue');
    
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
