/**
 * EJEMPLOS DE USO DEL SIMULADOR WHAT-IF
 * 
 * Este archivo muestra cómo usar el PayrollSimulator en diferentes escenarios
 */

import { PayrollSimulator } from './PayrollSimulator';
import { SimulationScenario, SimulationType } from '@/types/simulation';

// ============================================
// EJEMPLO 1: Simular contratación de empleados
// ============================================
export async function exampleHireEmployees() {
  const currentData = [
    { id: '1', salary: 2000000, nombre: 'Juan', apellido: 'Pérez' },
    { id: '2', salary: 2500000, nombre: 'María', apellido: 'López' },
    { id: '3', salary: 1800000, nombre: 'Carlos', apellido: 'Gómez' },
  ];

  const scenario: SimulationScenario = {
    id: 'sim-1',
    type: 'hire_employees',
    name: 'Contratar 2 Desarrolladores',
    description: 'Simular contratación de 2 desarrolladores con salario de 3.5M',
    parameters: {
      newEmployees: {
        count: 2,
        averageSalary: 3500000,
        contractType: 'indefinido',
        startDate: '2025-11-01'
      },
      projectionMonths: 12
    },
    createdAt: new Date().toISOString()
  };

  const result = await PayrollSimulator.simulate(scenario, currentData);
  
  console.log('📊 Resultado de simulación:');
  console.log('Baseline:', result.baseline);
  console.log('Proyectado:', result.projected);
  console.log('Comparación:', result.comparison);
  console.log('ROI:', result.roi);
  console.log('Recomendaciones:', result.recommendations);
  
  return result;
}

// ============================================
// EJEMPLO 2: Simular aumento salarial porcentual
// ============================================
export async function exampleSalaryIncreasePercentage() {
  const currentData = [
    { id: '1', salary: 2000000, nombre: 'Juan', apellido: 'Pérez' },
    { id: '2', salary: 2500000, nombre: 'María', apellido: 'López' },
    { id: '3', salary: 1800000, nombre: 'Carlos', apellido: 'Gómez' },
  ];

  const scenario: SimulationScenario = {
    id: 'sim-2',
    type: 'salary_increase',
    name: 'Aumento Salarial del 10%',
    description: 'Aumentar salarios en 10% para todos los empleados',
    parameters: {
      salaryChange: {
        type: 'percentage',
        value: 10, // 10%
        affectedEmployees: ['all'],
        effectiveDate: '2025-11-01'
      },
      projectionMonths: 12
    },
    createdAt: new Date().toISOString()
  };

  const result = await PayrollSimulator.simulate(scenario, currentData);
  
  console.log('💰 Impacto del aumento:');
  console.log(`Costo mensual adicional: ${PayrollSimulator.formatCurrency(result.comparison.monthlyCostIncrease)}`);
  console.log(`Costo anual adicional: ${PayrollSimulator.formatCurrency(result.comparison.annualCostIncrease)}`);
  console.log(`Nivel de riesgo: ${result.roi.riskLevel}`);
  
  return result;
}

// ============================================
// EJEMPLO 3: Simular aumento salarial fijo
// ============================================
export async function exampleSalaryIncreaseFixed() {
  const currentData = [
    { id: '1', salary: 2000000, nombre: 'Juan', apellido: 'Pérez', cargo: 'Operario' },
    { id: '2', salary: 2500000, nombre: 'María', apellido: 'López', cargo: 'Supervisor' },
    { id: '3', salary: 1800000, nombre: 'Carlos', apellido: 'Gómez', cargo: 'Operario' },
  ];

  const scenario: SimulationScenario = {
    id: 'sim-3',
    type: 'salary_increase',
    name: 'Aumento de $300K a Operarios',
    description: 'Aumentar $300,000 a todos los operarios',
    parameters: {
      salaryChange: {
        type: 'fixed',
        value: 300000,
        affectedEmployees: ['1', '3'], // Solo operarios
        effectiveDate: '2025-11-01'
      },
      projectionMonths: 6
    },
    createdAt: new Date().toISOString()
  };

  const result = await PayrollSimulator.simulate(scenario, currentData);
  
  return result;
}

// ============================================
// EJEMPLO 4: Comparar múltiples escenarios
// ============================================
export async function exampleCompareScenarios() {
  const currentData = [
    { id: '1', salary: 2000000 },
    { id: '2', salary: 2500000 },
    { id: '3', salary: 1800000 },
  ];

  // Escenario 1: Contratar 2 personas
  const scenario1: SimulationScenario = {
    id: 'comp-1',
    type: 'hire_employees',
    name: 'Contratar 2 personas',
    description: 'Contratar 2 personas con salario promedio',
    parameters: {
      newEmployees: { count: 2, averageSalary: 2200000 },
      projectionMonths: 12
    },
    createdAt: new Date().toISOString()
  };

  // Escenario 2: Aumentar 10% a todos
  const scenario2: SimulationScenario = {
    id: 'comp-2',
    type: 'salary_increase',
    name: 'Aumentar 10%',
    description: 'Aumentar 10% a todos',
    parameters: {
      salaryChange: { type: 'percentage', value: 10, affectedEmployees: ['all'] },
      projectionMonths: 12
    },
    createdAt: new Date().toISOString()
  };

  const result1 = await PayrollSimulator.simulate(scenario1, currentData);
  const result2 = await PayrollSimulator.simulate(scenario2, currentData);

  console.log('📊 Comparación de escenarios:');
  console.log('\nEscenario 1 (Contratar):');
  console.log(`- Costo anual: ${PayrollSimulator.formatCurrency(result1.comparison.annualCostIncrease)}`);
  console.log(`- Riesgo: ${result1.roi.riskLevel}`);
  
  console.log('\nEscenario 2 (Aumento):');
  console.log(`- Costo anual: ${PayrollSimulator.formatCurrency(result2.comparison.annualCostIncrease)}`);
  console.log(`- Riesgo: ${result2.roi.riskLevel}`);

  return { scenario1: result1, scenario2: result2 };
}

// ============================================
// EJEMPLO 5: Uso en componente React
// ============================================
export const SimulatorUsageExample = `
// En un componente React:

import { PayrollSimulator } from '@/services/PayrollSimulator';
import { SimulationCard } from '@/components/maya/SimulationCard';

function MySimulatorComponent() {
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    
    const currentData = await fetchCurrentPayrollData();
    
    const scenario = {
      id: 'sim-1',
      type: 'hire_employees',
      name: 'Contratar 2 personas',
      description: 'Simular contratación',
      parameters: {
        newEmployees: { count: 2, averageSalary: 3000000 },
        projectionMonths: 12
      },
      createdAt: new Date().toISOString()
    };

    const result = await PayrollSimulator.simulate(scenario, currentData);
    setSimulationResult(result);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={runSimulation}>Simular</button>
      {loading && <div>Simulando...</div>}
      {simulationResult && (
        <SimulationCard 
          result={simulationResult}
          onAction={(action) => console.log('Action:', action)}
        />
      )}
    </div>
  );
}
`;
