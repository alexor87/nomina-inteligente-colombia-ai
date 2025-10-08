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
      message: '🛡️ Escaneo Proactivo\n\n¿Deseas escanear el sistema?',
      quickReplies: [
        { value: 'yes', label: '✅ Sí' },
        { value: 'no', label: '❌ No' }
      ],
      nextStep: (data, userInput) => userInput === 'yes' ? 'execution' : 'completed'
    },
    execution: {
      id: 'execution',
      type: FlowStepType.EXECUTION,
      message: '🔍 Escaneando...',
      nextStep: 'completed'
    },
    completed: {
      id: 'completed',
      type: FlowStepType.RESULT,
      message: '✅ Completado',
      nextStep: 'completed'
    }
  }
};
