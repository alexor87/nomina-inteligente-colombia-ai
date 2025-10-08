import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';

export const whatIfSimulationFlow: GuidedFlow = {
  id: FlowType.WHAT_IF_SIMULATION,
  name: 'Simulador What-If',
  description: 'Simula escenarios de nómina en tiempo real',
  icon: '🎯',
  initialStep: 'greeting',
  completedStep: 'result',
  steps: {
    greeting: {
      id: 'greeting',
      type: FlowStepType.GREETING,
      message: '🎯 ¡Perfecto! Voy a ayudarte a simular un escenario de nómina.\n\n¿Qué quieres simular?',
      quickReplies: [
        { label: '👥 Contratar empleados', value: 'hire_employees', icon: '👥' },
        { label: '💰 Aumentar salarios', value: 'salary_increase', icon: '💰' },
        { label: '⏰ Cambiar horas extra', value: 'overtime_change', icon: '⏰' },
        { label: '🎁 Modificar bonificaciones', value: 'bonus_change', icon: '🎁' }
      ],
      nextStep: 'scenario_details',
      canGoBack: false
    },
    scenario_details: {
      id: 'scenario_details',
      type: FlowStepType.INPUT,
      message: (data) => {
        const messages: Record<string, string> = {
          hire_employees: '👥 **Simulación de contratación**\n\n¿Cuántos empleados quieres contratar y cuál sería el salario promedio?\n\nEjemplo: "3 empleados con salario de 2.5 millones"',
          salary_increase: '💰 **Simulación de aumento salarial**\n\n¿Qué tipo de aumento quieres simular?\n\nEjemplo: "Aumentar 10% a todos" o "Aumentar $300,000 a operarios"',
          overtime_change: '⏰ **Simulación de horas extra**\n\n¿Cuántas horas extra promedio por empleado?\n\nEjemplo: "15 horas extra mensuales"',
          bonus_change: '🎁 **Simulación de bonificaciones**\n\n¿Qué bonificación quieres simular?\n\nEjemplo: "Bonificación única de $500,000 a todos"'
        };
        return messages[data.scenarioType] || 'Describe el escenario que quieres simular';
      },
      inputPlaceholder: 'Ej: 3 empleados con salario de 2.5 millones',
      inputType: 'text',
      nextStep: 'projection_period',
      canGoBack: true
    },
    projection_period: {
      id: 'projection_period',
      type: FlowStepType.SELECT,
      message: '📅 ¿Para cuántos meses quieres proyectar el impacto?',
      quickReplies: [
        { label: '3 meses', value: '3', icon: '📅' },
        { label: '6 meses', value: '6', icon: '📅' },
        { label: '12 meses', value: '12', icon: '📊' },
        { label: '24 meses', value: '24', icon: '📈' }
      ],
      nextStep: 'preview',
      canGoBack: true
    },
    preview: {
      id: 'preview',
      type: FlowStepType.PREVIEW,
      message: (data) => {
        return `🎯 **Resumen de simulación:**\n\n` +
               `• **Escenario:** ${data.scenarioDescription}\n` +
               `• **Período:** ${data.projectionMonths} meses\n\n` +
               `¿Ejecutar la simulación?`;
      },
      quickReplies: [
        { label: '✅ Sí, simular', value: 'confirm', icon: '✅' },
        { label: '✏️ Modificar', value: 'back', icon: '✏️' },
        { label: '❌ Cancelar', value: 'cancel', icon: '❌' }
      ],
      nextStep: (data, input) => {
        if (input === 'confirm') return 'execution';
        if (input === 'back') return 'greeting';
        return 'result';
      },
      canGoBack: true
    },
    execution: {
      id: 'execution',
      type: FlowStepType.EXECUTION,
      message: '⚙️ Simulando escenario y calculando ROI...\n\nAnalizando impacto financiero...',
      nextStep: 'result',
      canGoBack: false
    },
    result: {
      id: 'result',
      type: FlowStepType.RESULT,
      message: (data) => {
        if (!data.success) {
          return `❌ No pude completar la simulación.\n\n${data.error || 'Ocurrió un error inesperado.'}`;
        }

        return `✅ **Simulación completada**\n\n` +
               `📊 ${data.summary || 'Análisis disponible'}\n\n` +
               `🎯 **Hallazgos clave:**\n${data.keyFindings || 'Ver tarjeta de simulación'}\n\n` +
               `¿Qué quieres hacer ahora?`;
      },
      quickReplies: (data) => {
        if (!data.success) {
          return [
            { label: '🔄 Intentar de nuevo', value: 'retry', icon: '🔄' },
            { label: '🏠 Volver al inicio', value: 'home', icon: '🏠' }
          ];
        }

        return [
          { label: '📊 Ver proyección mensual', value: 'view_timeline', icon: '📊' },
          { label: '📥 Exportar simulación', value: 'export', icon: '📥' },
          { label: '🔄 Comparar escenarios', value: 'compare', icon: '🔄' },
          { label: '🎯 Nueva simulación', value: 'new', icon: '🎯' }
        ];
      },
      nextStep: (data, input) => {
        if (input === 'retry' || input === 'new') return 'greeting';
        return 'result';
      },
      canGoBack: false
    }
  }
};
