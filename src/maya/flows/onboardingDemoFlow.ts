import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';

export const onboardingDemoFlow: GuidedFlow = {
  id: FlowType.ONBOARDING_DEMO_LIQUIDATION,
  name: 'Liquidación Demo',
  description: 'Experimenta el poder de MAYA con una liquidación de prueba',
  icon: '✨',
  initialStep: 'welcome',
  completedStep: 'pdf_ready',
  
  steps: {
    // 1. BIENVENIDA
    welcome: {
      id: 'welcome',
      type: FlowStepType.GREETING,
      message: `¡Bienvenido a **NominaSync**! 🎉

Soy **MAYA**, tu asistente inteligente de nómina. Voy a ayudarte a experimentar el poder de nuestra plataforma con una **liquidación de prueba** en menos de 3 minutos.

**¿Qué vamos a hacer?**
1. 📝 Capturar datos de un empleado ejemplo
2. 💰 Calcular su nómina automáticamente
3. 📄 Generar su comprobante de pago profesional
4. 📧 Mostrarte cómo enviarlo por email

Esta liquidación es **solo para demostración** - no se guardará en tu cuenta.

¿Listo para comenzar?`,
      quickReplies: [
        { label: '🚀 ¡Empecemos!', value: 'start' },
        { label: '❓ Más información', value: 'more_info' }
      ],
      nextStep: (data, input) => input === 'more_info' ? 'more_info' : 'capture_name',
      canGoBack: false
    },

    // Información adicional (opcional)
    more_info: {
      id: 'more_info',
      type: FlowStepType.GREETING,
      message: `**Sobre esta demo:**

✨ **Totalmente gratis** - Sin límites ni cargos
🔒 **Datos seguros** - Esta liquidación no se guarda en la base de datos
⚡ **Super rápida** - Solo 2-3 minutos
📊 **Cálculos reales** - Usamos la normativa laboral colombiana vigente

**¿Por qué es útil?**
- Verás cómo MAYA automatiza toda la liquidación
- Entenderás el formato del comprobante de pago
- Experimentarás nuestra interfaz conversacional

¿Listo para empezar?`,
      quickReplies: [
        { label: '🚀 ¡Empecemos!', value: 'start' }
      ],
      nextStep: 'capture_name',
      canGoBack: true
    },

    // 2. CAPTURA DE NOMBRE Y SALARIO
    capture_name: {
      id: 'capture_name',
      type: FlowStepType.INPUT,
      message: `Perfecto, vamos a crear un empleado de ejemplo.

Escribe el **nombre completo** y el **salario** del empleado. Por ejemplo:

*"María González, $3.200.000"*
*"Juan Pérez, 5000000"*

También puedes escribir solo el nombre y luego te pregunto el salario.`,
      inputPlaceholder: 'Ej: María González, $3.200.000',
      validationRules: [
        { type: 'required', message: 'Por favor escribe un nombre o nombre y salario' },
        { type: 'minLength', value: 3, message: 'El nombre debe tener al menos 3 caracteres' }
      ],
      nextStep: (data) => {
        // Si el input contiene números (salario), ir directo a preview
        const input = data.capture_name || '';
        const hasNumbers = /\d/.test(input);
        return hasNumbers ? 'preview_calculation' : 'capture_salary';
      },
      canGoBack: true,
      dataKey: 'capture_name'
    },

    // 3. CAPTURA DE SALARIO (si no se ingresó antes)
    capture_salary: {
      id: 'capture_salary',
      type: FlowStepType.INPUT,
      message: (data) => {
        const parsedName = parseEmployeeInput(data.capture_name);
        return `Excelente, **${parsedName.name}** será nuestro empleado de prueba.

Ahora dime, ¿cuál es su **salario mensual**?`;
      },
      inputPlaceholder: 'Ej: 3200000 o $3.200.000',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'Por favor ingresa el salario' },
        { 
          type: 'custom', 
          message: 'Por favor ingresa un salario válido (solo números)',
          validator: (input: string) => {
            const cleanNumber = input.replace(/[$.]/g, '');
            return !isNaN(Number(cleanNumber)) && Number(cleanNumber) > 0;
          }
        }
      ],
      nextStep: 'preview_calculation',
      canGoBack: true,
      dataKey: 'capture_salary'
    },

    // 4. PREVIEW DE CÁLCULO
    preview_calculation: {
      id: 'preview_calculation',
      type: FlowStepType.PREVIEW,
      message: (data) => {
        const parsedData = parseEmployeeInput(data.capture_name, data.capture_salary);
        return `Perfecto, voy a calcular la nómina para:

**👤 Empleado:** ${parsedData.name}
**💰 Salario Base:** ${formatCurrency(parsedData.salary)}
**📅 Días trabajados:** 30 días (mes completo)

**Calcularé:**
- ✅ Devengados (salario + auxilio de transporte / conectividad si aplica)
- ✅ Deducciones (salud + pensión)
- ✅ Neto a pagar

¿Procedemos con el cálculo?`;
      },
      quickReplies: [
        { label: '💰 Calcular Nómina', value: 'calculate' },
        { label: '✏️ Corregir datos', value: 'back' }
      ],
      nextStep: (data, input) => input === 'back' ? 'capture_name' : 'calculating',
      canGoBack: true
    },

    // 5. CALCULANDO (loading state)
    calculating: {
      id: 'calculating',
      type: FlowStepType.EXECUTION,
      message: '⚙️ **Calculando nómina...**\n\nEstoy procesando los cálculos según la normativa laboral colombiana vigente.',
      nextStep: 'show_results',
      canGoBack: false
    },

    // 6. MOSTRAR RESULTADOS
    show_results: {
      id: 'show_results',
      type: FlowStepType.RESULT,
      message: (data) => {
        const result = data._calculation_result;
        if (!result) return 'Error: No se pudieron obtener los resultados';

        return `✅ **¡Liquidación completada!**

**📊 RESUMEN DE NÓMINA**

**Devengados:**
💵 Salario Base: ${formatCurrency(result.salarioBase)}
🚌 Auxilio de Transporte / Conectividad: ${formatCurrency(result.auxilioTransporte)}
**━━━━━━━━━━━━━━━━**
**💰 Total Devengado: ${formatCurrency(result.totalDevengado)}**

**Deducciones:**
🏥 Salud (4%): ${formatCurrency(result.saludEmpleado)}
👴 Pensión (4%): ${formatCurrency(result.pensionEmpleado)}
**━━━━━━━━━━━━━━━━**
**📉 Total Deducciones: ${formatCurrency(result.totalDeducciones)}**

**━━━━━━━━━━━━━━━━**
**✨ NETO A PAGAR: ${formatCurrency(result.netoPagar)}** 💵

¿Quieres ver el comprobante de pago profesional?`;
      },
      quickReplies: [
        { label: '📄 Generar Comprobante', value: 'generate_pdf' },
        { label: '🔁 Probar otro salario', value: 'restart' }
      ],
      nextStep: (data, input) => input === 'restart' ? 'capture_name' : 'generating_pdf',
      canGoBack: false
    },

    // 7. GENERANDO PDF
    generating_pdf: {
      id: 'generating_pdf',
      type: FlowStepType.EXECUTION,
      message: '📄 **Generando comprobante de pago...**\n\nEstoy creando un PDF profesional con todos los detalles.',
      nextStep: 'pdf_ready',
      canGoBack: false
    },

    // 8. PDF LISTO
    pdf_ready: {
      id: 'pdf_ready',
      type: FlowStepType.RESULT,
      message: (data) => {
        const parsedData = parseEmployeeInput(data.capture_name, data.capture_salary);
        return `🎉 **¡Comprobante generado exitosamente!**

El comprobante de pago para **${parsedData.name}** está listo.

**¿Qué puedes hacer ahora?**
👀 Ver el PDF generado
📧 Simular envío por email (no se enviará realmente)
💼 Registrar este empleado de verdad en tu cuenta

**💡 Dato curioso:** En producción, este proceso toma exactamente el mismo tiempo, pero se guarda automáticamente en la nube y puedes enviarlo por email con un clic.

¿Qué te gustaría hacer?`;
      },
      quickReplies: [
        { label: '👀 Ver PDF', value: 'view_pdf' },
        { label: '📧 Simular Email', value: 'simulate_email' },
        { label: '💼 Registrar Empleado Real', value: 'register_real' },
        { label: '🔁 Otra Demo', value: 'restart' }
      ],
      nextStep: () => 'completed',
      canGoBack: false
    },

    // Completado
    completed: {
      id: 'completed',
      type: FlowStepType.RESULT,
      message: `✨ **¡Demo completada!**

Espero que hayas disfrutado esta experiencia.

**Próximos pasos sugeridos:**
1. 👥 Registra tus empleados reales
2. 📅 Crea tu primer período de nómina
3. 💰 Liquida tu primera nómina real
4. 📊 Explora los reportes y análisis

Si necesitas ayuda en cualquier momento, solo escribe tu pregunta y estaré aquí para ayudarte.

¡Bienvenido a NominaSync! 🚀`,
      quickReplies: [
        { label: '👥 Registrar Empleados', value: 'goto_employees' },
        { label: '💬 Hacer una pregunta', value: 'ask_question' }
      ],
      nextStep: () => 'completed',
      canGoBack: false
    }
  }
};

// Helper para parsear el input del usuario
function parseEmployeeInput(nameInput: string, salaryInput?: string): { name: string; salary: number } {
  let name = '';
  let salary = 0;

  // Si hay salaryInput separado, usar ese
  if (salaryInput) {
    name = nameInput.trim();
    salary = Number(salaryInput.replace(/[$.]/g, ''));
  } else {
    // Intentar extraer del nameInput completo
    // Buscar patrones: "Nombre, $3200000" o "Nombre, 3200000"
    const match = nameInput.match(/^(.+?)[,\s]+\$?([\d.]+)$/);
    
    if (match) {
      name = match[1].trim();
      salary = Number(match[2].replace(/\./g, ''));
    } else {
      // Solo nombre sin salario
      name = nameInput.trim();
      salary = 0;
    }
  }

  return { name, salary };
}

// Helper para formatear moneda
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
