import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';
import { NOVEDAD_CATEGORIES } from '@/types/novedades-enhanced';

export const payrollCalculationFlow: GuidedFlow = {
  id: FlowType.PAYROLL_CALCULATE,
  name: 'Calcular Nómina',
  description: 'Proceso guiado para calcular la nómina de un período',
  icon: '💰',
  steps: {
    greeting: {
      id: 'greeting',
      type: FlowStepType.GREETING,
      message: `¡Hola! 👋 Voy a ayudarte a calcular la nómina paso a paso.

Este proceso incluye:
✅ Selección del período
✅ Validación de empleados
✅ Registro de novedades (opcional)
✅ Cálculo automático

¿Empezamos?`,
      quickReplies: [
        { label: '▶️ Comenzar', value: 'start' },
        { label: '❌ Cancelar', value: 'cancel' }
      ],
      nextStep: (data, input) => {
        if (input === 'cancel') return 'cancelled';
        return 'period_selection';
      },
      canGoBack: false
    },

    period_selection: {
      id: 'period_selection',
      type: FlowStepType.SELECT,
      message: '📅 **Paso 1: Selecciona el período de nómina**\n\n¿Para qué período quieres calcular la nómina?',
      quickReplies: [
        { label: '📊 Período actual', value: 'current_period' },
        { label: '📋 Ver todos los períodos', value: 'list_periods' }
      ],
      nextStep: (data, input) => {
        if (input === 'current_period' || input?.includes('period_')) {
          return 'employee_selection';
        }
        return 'period_selection';
      },
      canGoBack: true
    },

    employee_selection: {
      id: 'employee_selection',
      type: FlowStepType.SELECT,
      message: (data) => {
        const periodName = data.period_name || 'el período seleccionado';
        return `👥 **Paso 2: Selecciona los empleados**\n\n¿Qué empleados quieres incluir en la nómina de **${periodName}**?`;
      },
      quickReplies: [
        { label: '✅ Todos los empleados activos', value: 'all_active' },
        { label: '👤 Empleados específicos', value: 'specific_employees' },
        { label: '🆕 Solo empleados nuevos', value: 'new_employees' }
      ],
      nextStep: () => 'loading_employees',
      canGoBack: true
    },

    loading_employees: {
      id: 'loading_employees',
      type: FlowStepType.EXECUTION,
      message: '⏳ **Cargando empleados...**\n\nEstoy consultando los empleados activos de tu empresa.',
      nextStep: () => 'novelties_check',
      canGoBack: false
    },

    novelties_check: {
      id: 'novelties_check',
      type: FlowStepType.HUB,
      message: (data) => {
        const employeeCount = data.employee_count || 0;
        const novedades = data.novedades || [];
        
        let msg = `📝 **Paso 3: Novedades del período**\n\n`;
        msg += `Empleados seleccionados: **${employeeCount}**\n`;
        
        if (novedades.length > 0) {
          msg += `\nNovedades registradas: **${novedades.length}**\n`;
          novedades.forEach((nov: any) => {
            msg += `• ${nov.tipo}: ${nov.empleado}\n`;
          });
        } else {
          msg += `\n*No hay novedades registradas aún.*\n`;
        }
        
        msg += `\n¿Quieres agregar novedades para este período?`;
        return msg;
      },
      quickReplies: [
        { label: '⏱️ Horas extras', value: 'add_overtime' },
        { label: '🏥 Incapacidades', value: 'add_disability' },
        { label: '🎁 Bonos/Primas', value: 'add_bonus' },
        { label: '📉 Ausencias', value: 'add_absence' },
        { label: '➡️ Continuar sin novedades', value: 'skip_novelties' }
      ],
      nextStep: (data, input) => {
        if (input === 'skip_novelties') return 'calculation_preview';
        if (input?.startsWith('add_')) {
          // Guardar el tipo de novedad seleccionado
          data.last_novelty_action = input;
          return 'novelty_subtype_selection';
        }
        return 'novelties_check';
      },
      canGoBack: true,
      canSkip: true,
      skipToStep: 'calculation_preview'
    },

    novelty_subtype_selection: {
      id: 'novelty_subtype_selection',
      type: FlowStepType.SELECT,
      message: (data) => {
        const actionTypeMap: Record<string, string> = {
          'add_overtime': 'Horas extras',
          'add_disability': 'Incapacidad',
          'add_bonus': 'Bono/Prima',
          'add_absence': 'Ausencia'
        };
        const typeLabel = actionTypeMap[data.last_novelty_action || ''] || 'novedad';
        
        // Generar opciones dinámicamente
        const actionToNovedadTypeMap: Record<string, string[]> = {
          'add_overtime': ['horas_extra'],
          'add_disability': ['incapacidad'],
          'add_bonus': ['bonificacion', 'auxilio_transporte', 'comisiones'],
          'add_absence': ['ausencia_justificada', 'ausencia_injustificada']
        };
        
        const noveltyAction = data.last_novelty_action || '';
        const novedadTypes = actionToNovedadTypeMap[noveltyAction] || [];
        
        let optionsText = '';
        novedadTypes.forEach((novedadType: string) => {
          // Buscar en devengados
          const devengadosObj = NOVEDAD_CATEGORIES.devengados as any;
          const deduccionesObj = NOVEDAD_CATEGORIES.deducciones as any;
          const config = devengadosObj[novedadType] || deduccionesObj[novedadType];
          
          if (config?.subtipos) {
            optionsText += `\n**${config.label}:**\n`;
            config.subtipos.forEach((subtipo: string) => {
              optionsText += `• ${subtipo.replace(/_/g, ' ')}\n`;
            });
          }
        });
        
        return `🎯 **Selecciona el tipo de ${typeLabel}**\n${optionsText}\n¿Qué tipo específico deseas registrar?`;
      },
      quickReplies: [
        { label: '⏱️ Diurnas', value: 'horas_extra:diurnas', icon: '⏱️' },
        { label: '🌙 Nocturnas', value: 'horas_extra:nocturnas', icon: '🌙' },
        { label: '⏱️🌞 Diurnas Dominicales', value: 'horas_extra:diurnas_dominicales', icon: '⏱️' },
        { label: '🌙🌞 Nocturnas Dominicales', value: 'horas_extra:nocturnas_dominicales', icon: '🌙' },
        { label: '🏥 EPS', value: 'incapacidad:eps', icon: '🏥' },
        { label: '🏥 ARL', value: 'incapacidad:arl', icon: '🏥' },
        { label: '🎁 Bonificación', value: 'bonificacion:default', icon: '🎁' },
        { label: '🚌 Auxilio Transporte', value: 'auxilio_transporte:default', icon: '🚌' },
        { label: '💰 Comisiones', value: 'comisiones:default', icon: '💰' },
        { label: '✅ Justificada', value: 'ausencia_justificada:default', icon: '✅' },
        { label: '❌ Injustificada', value: 'ausencia_injustificada:default', icon: '❌' }
      ],
      nextStep: (data, input) => {
        // Guardar el tipo y subtipo seleccionado
        if (input) {
          const [tipoNovedad, subtipo] = input.split(':');
          data.selected_novedad_type = tipoNovedad;
          data.selected_novedad_subtype = subtipo !== 'default' ? subtipo : undefined;
        }
        return 'novelty_input';
      },
      canGoBack: true
    },

    novelty_input: {
      id: 'novelty_input',
      type: FlowStepType.INPUT,
      message: (data) => {
        const tipoLabel = data.selected_novedad_type?.replace(/_/g, ' ') || 'novedad';
        const subtipoLabel = data.selected_novedad_subtype?.replace(/_/g, ' ') || '';
        const fullLabel = subtipoLabel ? `${tipoLabel} - ${subtipoLabel}` : tipoLabel;
        
        let example = 'Ejemplo: "Juan Pérez, 10 horas"';
        if (data.selected_novedad_type?.includes('horas')) {
          example = 'Ejemplo: "Juan Pérez, 10 horas"';
        } else if (data.selected_novedad_type?.includes('incapacidad') || data.selected_novedad_type?.includes('ausencia')) {
          example = 'Ejemplo: "Juan Pérez, 3 días"';
        } else if (data.selected_novedad_type?.includes('bono') || data.selected_novedad_type?.includes('comision')) {
          example = 'Ejemplo: "Juan Pérez, 500000"';
        }
        
        return `📝 **Registrar ${fullLabel}**\n\nIngresa los detalles:\n\n${example}`;
      },
      inputPlaceholder: 'Empleado, cantidad',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'Debes ingresar los detalles de la novedad' },
        { type: 'minLength', value: 5, message: 'La descripción debe tener al menos 5 caracteres' }
      ],
      nextStep: () => 'novelties_check',
      canGoBack: true
    },

    calculation_preview: {
      id: 'calculation_preview',
      type: FlowStepType.PREVIEW,
      message: (data) => {
        const employeeCount = data.employee_count || 0;
        const periodName = data.period_name || 'Período seleccionado';
        const novedades = data.novedades || [];
        
        let msg = `📊 **Vista Previa del Cálculo**\n\n`;
        msg += `**Período:** ${periodName}\n`;
        msg += `**Empleados:** ${employeeCount}\n`;
        msg += `**Novedades:** ${novedades.length}\n\n`;
        
        if (data.estimated_gross) {
          msg += `💰 **Estimado:**\n`;
          msg += `• Total devengado: $${Number(data.estimated_gross).toLocaleString('es-CO')}\n`;
          msg += `• Deducciones: $${Number(data.estimated_deductions).toLocaleString('es-CO')}\n`;
          msg += `• Neto a pagar: $${Number(data.estimated_net).toLocaleString('es-CO')}\n\n`;
        }
        
        msg += `¿Deseas proceder con el cálculo?`;
        return msg;
      },
      quickReplies: [
        { label: '✅ Calcular nómina', value: 'confirm' },
        { label: '📝 Agregar más novedades', value: 'back_to_novelties' },
        { label: '❌ Cancelar', value: 'cancel' }
      ],
      nextStep: (data, input) => {
        if (input === 'confirm') return 'execution';
        if (input === 'back_to_novelties') return 'novelties_check';
        return 'cancelled';
      },
      canGoBack: true
    },

    execution: {
      id: 'execution',
      type: FlowStepType.EXECUTION,
      message: '⚙️ **Calculando nómina...**\n\nEsto puede tomar unos momentos. Por favor espera.',
      nextStep: () => 'result',
      canGoBack: false
    },

    result: {
      id: 'result',
      type: FlowStepType.RESULT,
      message: (data) => {
        const result = data._executionResult || {};
        const employeeCount = result.employees_processed || data.employee_count || 0;
        const totalGross = result.total_devengado || 0;
        const totalDeductions = result.total_deducciones || 0;
        const totalNet = result.total_neto || 0;
        
        return `✅ **¡Nómina calculada exitosamente!**

📊 **Resumen:**
• Empleados procesados: **${employeeCount}**
• Total devengado: **$${Number(totalGross).toLocaleString('es-CO')}**
• Total deducciones: **$${Number(totalDeductions).toLocaleString('es-CO')}**
• **Neto a pagar: $${Number(totalNet).toLocaleString('es-CO')}**

La nómina ha sido calculada y está lista para su revisión.`;
      },
      quickReplies: [
        { label: '📋 Ver nómina calculada', value: 'view_payroll' },
        { label: '📧 Enviar comprobantes', value: 'send_vouchers' },
        { label: '✅ Listo', value: 'completed' }
      ],
      nextStep: (data, input) => {
        if (input === 'view_payroll') {
          window.location.href = '/payroll/liquidation';
          return 'completed';
        }
        if (input === 'send_vouchers') {
          window.location.href = '/payroll/vouchers';
          return 'completed';
        }
        return 'completed';
      },
      canGoBack: false
    },

    cancelled: {
      id: 'cancelled',
      type: FlowStepType.RESULT,
      message: '❌ Proceso de cálculo cancelado.\n\nPuedes iniciar el proceso nuevamente cuando lo necesites.',
      nextStep: () => 'completed',
      canGoBack: false
    },

    completed: {
      id: 'completed',
      type: FlowStepType.RESULT,
      message: '✅ Proceso completado.',
      nextStep: () => 'completed',
      canGoBack: false
    }
  },
  initialStep: 'greeting',
  completedStep: 'completed'
};
