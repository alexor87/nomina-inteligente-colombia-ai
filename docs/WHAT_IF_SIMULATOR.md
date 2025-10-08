# 🎯 Simulador What-If de Nómina con ROI

Sistema de simulación en tiempo real para analizar el impacto financiero de cambios en la nómina antes de implementarlos.

## 🌟 Características Principales

### 1. **Tipos de Simulación Soportados**
- 👥 **Contratación de Empleados**: Simula el impacto de nuevas contrataciones
- 💰 **Cambios Salariales**: Aumentos o disminuciones porcentuales o fijos
- ⏰ **Horas Extra**: Cambios en promedio de horas extra mensuales
- 🎁 **Bonificaciones**: Bonos únicos o recurrentes

### 2. **Análisis Automático**
- 📊 **Comparación Financiera**: Baseline vs Proyectado
- 💵 **Impacto Mensual y Anual**: Costo total adicional
- 📈 **Proyección Timeline**: Vista mes a mes del impacto
- 🎯 **Análisis ROI**: Período de retorno, nivel de riesgo, confianza

### 3. **Insights Inteligentes**
- ✅ **Recomendaciones**: Acciones sugeridas basadas en el análisis
- ⚠️ **Identificación de Riesgos**: Alertas automáticas sobre riesgos
- 📉 **Métricas Clave**: Costo por empleado, % de cambio, etc.

## 🚀 Uso Rápido

### Ejemplo Básico: Simular Contratación

```typescript
import { PayrollSimulator } from '@/services/PayrollSimulator';

// 1. Datos actuales de nómina
const currentData = [
  { id: '1', salary: 2000000, nombre: 'Juan', apellido: 'Pérez' },
  { id: '2', salary: 2500000, nombre: 'María', apellido: 'López' },
];

// 2. Definir escenario
const scenario = {
  id: 'sim-1',
  type: 'hire_employees',
  name: 'Contratar 2 Desarrolladores',
  description: 'Simular contratación de 2 desarrolladores',
  parameters: {
    newEmployees: {
      count: 2,
      averageSalary: 3500000
    },
    projectionMonths: 12
  },
  createdAt: new Date().toISOString()
};

// 3. Ejecutar simulación
const result = await PayrollSimulator.simulate(scenario, currentData);

// 4. Analizar resultados
console.log('Costo mensual adicional:', result.comparison.monthlyCostIncrease);
console.log('Costo anual adicional:', result.comparison.annualCostIncrease);
console.log('Nivel de riesgo:', result.roi.riskLevel);
```

## 📊 Estructura de Resultados

```typescript
interface SimulationResult {
  // Situación actual
  baseline: FinancialSnapshot;
  
  // Situación proyectada
  projected: FinancialSnapshot;
  
  // Comparación entre ambas
  comparison: {
    employeeCountChange: number;
    totalCostChange: number;
    totalCostChangePercentage: number;
    monthlyCostIncrease: number;
    annualCostIncrease: number;
  };
  
  // Análisis ROI
  roi: {
    investmentRequired: number;
    paybackPeriod?: number; // Meses para recuperar inversión
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number; // 0-100
  };
  
  // Proyección mensual
  timeline: MonthlyProjection[];
  
  // Insights
  recommendations: string[];
  risks: string[];
}
```

## 🎯 Casos de Uso Comunes

### 1. Planificación de Contrataciones
```typescript
const scenario = {
  type: 'hire_employees',
  parameters: {
    newEmployees: {
      count: 5,
      averageSalary: 2800000
    },
    projectionMonths: 12
  }
};
```

**Preguntas que responde:**
- ¿Cuánto aumentará mi nómina mensual?
- ¿Puedo cubrir el costo con mi presupuesto actual?
- ¿En cuánto tiempo recuperaré la inversión?

### 2. Aumentos Salariales Anuales
```typescript
const scenario = {
  type: 'salary_increase',
  parameters: {
    salaryChange: {
      type: 'percentage',
      value: 8.5, // 8.5% de aumento
      affectedEmployees: ['all']
    },
    projectionMonths: 12
  }
};
```

**Preguntas que responde:**
- ¿Cuál es el impacto real de un aumento del 8.5%?
- ¿Cuánto representará en el año completo?
- ¿Es sostenible con el flujo de caja actual?

### 3. Ajustes por Cargo
```typescript
const scenario = {
  type: 'salary_increase',
  parameters: {
    salaryChange: {
      type: 'fixed',
      value: 400000,
      affectedEmployees: ['emp1', 'emp2', 'emp3'] // Solo operarios
    },
    projectionMonths: 6
  }
};
```

**Preguntas que responde:**
- ¿Cuánto cuesta nivelar salarios por cargo?
- ¿Es mejor un aumento fijo o porcentual?

## 🎨 Componentes UI

### SimulationCard
Muestra el resultado de una simulación con métricas clave:

```tsx
import { SimulationCard } from '@/components/maya/SimulationCard';

<SimulationCard 
  result={simulationResult}
  onAction={(action) => {
    if (action === 'view_timeline') showTimeline();
    if (action === 'export') exportSimulation();
  }}
/>
```

### SimulationTimeline
Visualiza la proyección mes a mes:

```tsx
import { SimulationTimeline } from '@/components/maya/SimulationTimeline';

<SimulationTimeline timeline={result.timeline} />
```

## 🤖 Integración con Maya

Maya puede ejecutar simulaciones conversacionalmente:

**Usuario:** "¿Qué pasaría si contrato 3 personas más?"

**Maya:** Ejecuta simulación y responde:
```
📊 Simulación completada:

• Costo mensual adicional: $12.5M (+18.2%)
• Impacto anual: $150M
• Nivel de riesgo: 🟡 Medio
• Confianza: 75%

💡 Recomendaciones:
• Considera contratación escalonada para reducir impacto inicial
• Verifica disponibilidad presupuestal antes de proceder

¿Qué quieres hacer?
[Ver proyección] [Exportar] [Comparar escenarios]
```

## 🔧 Configuración Avanzada

### Personalizar Cálculos

```typescript
const customConfig = {
  salaryMin: 1423500,
  healthEmployee: 0.04,
  healthEmployer: 0.085,
  pensionEmployee: 0.04,
  pensionEmployer: 0.12,
  // ... más configuraciones
};

const result = await PayrollSimulator.simulate(
  scenario, 
  currentData, 
  customConfig
);
```

### Múltiples Escenarios (Comparación)

```typescript
// Escenario A: Contratar
const scenarioA = { type: 'hire_employees', /* ... */ };
const resultA = await PayrollSimulator.simulate(scenarioA, data);

// Escenario B: Aumentar salarios
const scenarioB = { type: 'salary_increase', /* ... */ };
const resultB = await PayrollSimulator.simulate(scenarioB, data);

// Comparar
if (resultA.roi.riskLevel === 'low' && 
    resultA.comparison.annualCostIncrease < resultB.comparison.annualCostIncrease) {
  console.log('Escenario A es más favorable');
}
```

## 📈 Interpretación de Resultados

### Nivel de Riesgo
- 🟢 **Bajo**: Cambio < 10% del costo actual
- 🟡 **Medio**: Cambio entre 10-25%
- 🔴 **Alto**: Cambio > 25%

### Confianza del Análisis
- **85%+**: Alta confianza, datos completos
- **70-84%**: Confianza media, algunas estimaciones
- **< 70%**: Confianza baja, muchas suposiciones

### Período de Retorno (ROI)
- Solo aplica para contrataciones
- Asume 5% de incremento en productividad
- Considera todos los costos laborales (no solo salario)

## 🎓 Mejores Prácticas

1. **Simula antes de decidir**: Siempre simula cambios importantes
2. **Compara escenarios**: Evalúa múltiples opciones
3. **Revisa los riesgos**: Presta atención a las alertas
4. **Proyecta a largo plazo**: Usa 12+ meses para decisiones estratégicas
5. **Exporta y documenta**: Guarda simulaciones para justificar decisiones

## 🚨 Limitaciones

- Los cálculos son aproximaciones basadas en porcentajes estándar
- No incluye subsidios o beneficios especiales por empresa
- Asume estabilidad en legislación laboral
- No considera rotación de personal
- ROI de contrataciones asume productividad estándar

## 📚 Recursos Adicionales

- Ver ejemplos completos en: `src/services/PayrollSimulator.example.ts`
- Handler de Maya: `supabase/functions/maya-intelligence/handlers/simulation-handler.ts`
- Flujo conversacional: `src/maya/flows/whatIfSimulationFlow.ts`
