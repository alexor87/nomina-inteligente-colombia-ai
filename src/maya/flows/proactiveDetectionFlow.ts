import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';

export const proactiveDetectionFlow: GuidedFlow = {
  id: FlowType.PROACTIVE_SCAN,
  name: 'Escaneo Proactivo',
  description: 'Detecta problemas potenciales',
  icon: '🛡️',
  initialStep: 'greeting',
  completedStep: 'completed',
  steps: {
    greeting: {
      id: 'greeting',
      type: FlowStepType.SELECT,
      message: '🛡️ Escaneo Proactivo\n\n¿Deseas escanear el sistema en busca de alertas y tareas pendientes?',
      quickReplies: [
        { value: 'yes', label: '✅ Sí, escanear' },
        { value: 'no', label: '❌ No' }
      ],
      nextStep: (data, userInput) => userInput === 'yes' ? 'execution' : 'completed'
    },
    execution: {
      id: 'execution',
      type: FlowStepType.EXECUTION,
      message: '🔍 Escaneando alertas y tareas pendientes...',
      nextStep: 'scan_result'
    },
    scan_result: {
      id: 'scan_result',
      type: FlowStepType.RESULT,
      message: (data) => {
        const lines = ['✅ Escaneo completado.\n'];
        const actionResult = data._action_execution_result;
        const pendingSalaryYears: string[] = actionResult?.pendingSalaryIncreaseYears ?? [];
        if (pendingSalaryYears.length > 0) {
          lines.push(`📈 Incremento salarial pendiente: El SMLMV está configurado para ${pendingSalaryYears.join(', ')} pero hay empleados sin ajustar.`);
          lines.push(`→ Ve a Configuración → Parámetros Legales y haz clic en "Iniciar proceso de incremento" para ajustar los salarios.`);
        } else {
          lines.push('No se encontraron alertas críticas pendientes.');
        }
        return lines.join('\n');
      },
      nextStep: 'completed'
    },
    completed: {
      id: 'completed',
      type: FlowStepType.RESULT,
      message: '✅ Escaneo finalizado.',
      nextStep: 'completed'
    }
  }
};
