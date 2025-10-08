import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';

/**
 * Flujo completo de onboarding que une:
 * 1. Creación de empleado (demo)
 * 2. Liquidación de nómina (demo)
 * 3. Generación de PDF
 * 4. Envío de email
 * 
 * IMPORTANTE: Todo en modo DEMO - nada se persiste en la BD
 */
export const onboardingCompleteFlow: GuidedFlow = {
  id: FlowType.ONBOARDING_COMPLETE,
  name: 'Onboarding Completo',
  description: 'Experiencia completa del sistema desde creación de empleado hasta envío de comprobante',
  icon: '🎯',
  initialStep: 'welcome',
  completedStep: 'completed',
  
  steps: {
    // =========== BIENVENIDA ===========
    welcome: {
      id: 'welcome',
      type: FlowStepType.GREETING,
      message: `¡Bienvenido a MAYA! 👋

Voy a guiarte a través de una **experiencia completa** de cómo funciona el sistema:

1️⃣ **Crear un empleado** (ejemplo)
2️⃣ **Liquidar su nómina** (cálculo real)
3️⃣ **Generar comprobante PDF**
4️⃣ **Enviarlo por email**

Esto es solo una **demostración** - nada se guardará en tu cuenta aún.

¿Listo para comenzar?`,
      quickReplies: [
        { label: '🚀 ¡Empezar demo!', value: 'start' },
        { label: '⏭️ Saltar al sistema', value: 'skip' }
      ],
      nextStep: (data, input) => input === 'skip' ? 'completed' : 'document_type',
      canGoBack: false
    },

    // =========== CREACIÓN DE EMPLEADO (SIMPLIFICADO) ===========
    document_type: {
      id: 'document_type',
      type: FlowStepType.SELECT,
      message: `📋 **Paso 1: Crear empleado de ejemplo**

¿Qué tipo de documento tiene?`,
      quickReplies: [
        { label: '🪪 CC - Cédula de Ciudadanía', value: 'CC' },
        { label: '👶 TI - Tarjeta de Identidad', value: 'TI' },
        { label: '🌍 CE - Cédula de Extranjería', value: 'CE' },
        { label: '✈️ PA - Pasaporte', value: 'PA' },
        { label: '📄 RC - Registro Civil', value: 'RC' },
        { label: '🏢 NIT', value: 'NIT' },
        { label: '🛂 PEP - Permiso Especial', value: 'PEP' },
        { label: '🔐 PPT - Protección Temporal', value: 'PPT' }
      ],
      nextStep: 'document_number',
      canGoBack: true
    },

    document_number: {
      id: 'document_number',
      type: FlowStepType.INPUT,
      message: '¿Número de documento?',
      inputPlaceholder: 'Ejemplo: 1234567890',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El número es obligatorio' },
        { type: 'pattern', value: /^[0-9]+$/, message: 'Solo números' }
      ],
      nextStep: 'first_name',
      canGoBack: true
    },

    first_name: {
      id: 'first_name',
      type: FlowStepType.INPUT,
      message: '¿Primer nombre del empleado?',
      inputPlaceholder: 'Ejemplo: Juan',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El nombre es obligatorio' },
        { 
          type: 'custom', 
          message: 'Solo letras',
          validator: (input) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(input)
        }
      ],
      nextStep: 'last_name',
      canGoBack: true
    },

    last_name: {
      id: 'last_name',
      type: FlowStepType.INPUT,
      message: '¿Apellido?',
      inputPlaceholder: 'Ejemplo: Pérez',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El apellido es obligatorio' },
        { 
          type: 'custom', 
          message: 'Solo letras',
          validator: (input) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(input)
        }
      ],
      nextStep: 'salary',
      canGoBack: true
    },

    salary: {
      id: 'salary',
      type: FlowStepType.INPUT,
      message: (data) => `💰 ¿Salario base de ${data.first_name}?`,
      inputPlaceholder: 'Ejemplo: 1423500',
      inputType: 'number',
      quickReplies: [
        { label: '💰 $1,423,500', value: '1423500' },
        { label: '💵 $2,000,000', value: '2000000' },
        { label: '💸 $3,000,000', value: '3000000' },
        { label: '✏️ Otro valor', value: '' }
      ],
      validationRules: [
        { type: 'required', message: 'El salario es obligatorio' },
        { type: 'min', value: 1423500, message: 'Mínimo $1,423,500' }
      ],
      nextStep: 'contract_type',
      canGoBack: true
    },

    contract_type: {
      id: 'contract_type',
      type: FlowStepType.SELECT,
      message: '¿Tipo de contrato?',
      quickReplies: [
        { label: '📄 Indefinido', value: 'indefinido' },
        { label: '📅 Término Fijo', value: 'fijo' }
      ],
      nextStep: 'start_date',
      canGoBack: true
    },

    start_date: {
      id: 'start_date',
      type: FlowStepType.INPUT,
      message: '¿Fecha de ingreso? (YYYY-MM-DD)',
      inputPlaceholder: '2024-01-15',
      inputType: 'date',
      quickReplies: [
        { label: '📅 Hoy', value: new Date().toISOString().split('T')[0] }
      ],
      validationRules: [
        { type: 'required', message: 'Fecha requerida' }
      ],
      nextStep: 'payment_frequency',
      canGoBack: true
    },

    payment_frequency: {
      id: 'payment_frequency',
      type: FlowStepType.SELECT,
      message: '¿Periodicidad de pago?',
      quickReplies: [
        { label: '📅 Mensual', value: 'mensual' },
        { label: '📆 Quincenal', value: 'quincenal' }
      ],
      nextStep: 'employee_preview',
      canGoBack: true
    },

    // =========== PREVIEW EMPLEADO ===========
    employee_preview: {
      id: 'employee_preview',
      type: FlowStepType.PREVIEW,
      message: (data) => `📋 **Resumen del empleado**

**Datos Personales:**
• ${data.document_type} ${data.document_number}
• ${data.first_name} ${data.last_name}

**Datos Laborales:**
• Salario: $${Number(data.salary).toLocaleString('es-CO')}
• Contrato: ${data.contract_type}
• Ingreso: ${data.start_date}
• Pago: ${data.payment_frequency}

¿Continuamos con la liquidación?`,
      quickReplies: [
        { label: '✅ Continuar', value: 'continue' },
        { label: '✏️ Editar', value: 'edit' }
      ],
      nextStep: (data, input) => input === 'edit' ? 'first_name' : 'worked_days_input',
      canGoBack: true
    },

    // =========== LIQUIDACIÓN DE NÓMINA ===========
    worked_days_input: {
      id: 'worked_days_input',
      type: FlowStepType.INPUT,
      message: (data) => `💰 **Paso 2: Liquidar nómina**

Ahora voy a calcular la nómina de **${data.first_name}** usando el motor de cálculo real del sistema.

¿Para cuántos días trabajados?`,
      inputPlaceholder: '30',
      inputType: 'number',
      quickReplies: [
        { label: '📅 30 días (mes completo)', value: '30' },
        { label: '📆 15 días (quincena)', value: '15' },
        { label: '✏️ Otro valor', value: '' }
      ],
      validationRules: [
        { type: 'required', message: 'Días requeridos' },
        { type: 'min', value: 1, message: 'Mínimo 1 día' },
        { type: 'max', value: 30, message: 'Máximo 30 días' }
      ],
      nextStep: 'calculating_payroll',
      canGoBack: true
    },

    // =========== CÁLCULO EN PROGRESO ===========
    calculating_payroll: {
      id: 'calculating_payroll',
      type: FlowStepType.EXECUTION,
      message: `⚙️ **Calculando nómina...**

🧮 Analizando salario base
💰 Calculando devengados
📊 Procesando deducciones
✅ Calculando neto

*Esto es un cálculo real usando las fórmulas colombianas...*`,
      nextStep: 'payroll_result',
      canGoBack: false
    },

    // =========== RESULTADO DE LIQUIDACIÓN ===========
    payroll_result: {
      id: 'payroll_result',
      type: FlowStepType.RESULT,
      message: (data) => {
        const result = data._payroll_calculation || {};
        const fmt = (n: any) => new Intl.NumberFormat('es-CO').format(Math.round(Number(n) || 0));
        
        return `✅ **¡Liquidación completada!**

👤 **${data.first_name} ${data.last_name}**
📅 Período: ${data.worked_days_input || 30} días

💰 **Devengado:** $${fmt(result.totalDevengado)}
  • Salario: $${fmt(result.salarioProporcional)}
  • Aux. Transporte: $${fmt(result.auxilioTransporte)}

📉 **Deducciones:** $${fmt(result.totalDeducciones)}
  • Salud (4%): $${fmt(result.saludEmpleado)}
  • Pensión (4%): $${fmt(result.pensionEmpleado)}

💵 **Neto a Pagar:** $${fmt(result.netoPagar)}`;
      },
      quickReplies: [
        { label: '📄 Generar comprobante PDF', value: 'generate_pdf' },
        { label: '🔄 Recalcular', value: 'recalculate' }
      ],
      nextStep: (data, input) => input === 'recalculate' ? 'worked_days_input' : 'generating_pdf',
      canGoBack: false
    },

    // =========== MINI WHAT-IF SIMULATOR ===========
    mini_simulator_intro: {
      id: 'mini_simulator_intro',
      type: FlowStepType.GREETING,
      message: (data) => {
        const fmt = (n: any) => new Intl.NumberFormat('es-CO').format(Math.round(Number(n) || 0));
        const currentSalary = data.salary || 1423500;
        
        return `⚡ **Esto cambia todo**

Acabas de usar el 5% de mis capacidades. 

Imagina tener **24/7** disponible:
• Un experto en nómina
• Un abogado laboral que conoce cada artículo
• Un asesor de seguridad social actualizado
• Un analista financiero que predice el futuro

**Todo en una conversación natural. Eso es MAYA.**

Ahora, veamos mi capacidad de **predicción financiera**:

Si contratas 2 personas como ${data.first_name}, ¿cuánto te costaría realmente?
🎯 Salario: $${fmt(currentSalary)} cada uno
📋 Contrato: ${data.contract_type || 'Indefinido'}

Los números te van a impactar...`;
      },
      quickReplies: [
        { label: '✅ Sí, ver simulación', value: 'confirm' },
        { label: '⏭️ Saltar al final', value: 'skip' }
      ],
      nextStep: (data, input) => input === 'skip' ? 'demo_completed' : 'mini_simulator_execution',
      canGoBack: true
    },

    mini_simulator_execution: {
      id: 'mini_simulator_execution',
      type: FlowStepType.EXECUTION,
      message: `⚙️ **Simulando escenario...**

🧮 Calculando costos adicionales
📊 Proyectando seguridad social
💰 Analizando impacto financiero
📈 Generando proyección 3 meses`,
      nextStep: 'mini_simulator_result',
      canGoBack: false
    },

    mini_simulator_result: {
      id: 'mini_simulator_result',
      type: FlowStepType.RESULT,
      message: (data) => {
        const fmt = (n: any) => new Intl.NumberFormat('es-CO').format(Math.round(Number(n) || 0));
        const salary = Number(data.salary) || 1423500;
        
        // Cálculos simplificados para el demo (2 empleados)
        const salariesIncrease = salary * 2;
        const transportAllowance = salary <= 2 * 1423500 ? 200000 * 2 : 0;
        
        // Seguridad Social Empresa (8.5% salud + 12% pensión + 0.522% ARL)
        const socialSecurityEmployer = salariesIncrease * 0.21022;
        
        // Parafiscales (4% caja + 3% ICBF + 2% SENA)
        const parafiscales = salariesIncrease * 0.09;
        
        // Prestaciones sociales mensuales (prima 8.33% + cesantías 8.33% + vacaciones 4.17%)
        const provisions = salariesIncrease * 0.2083;
        
        const totalMonthlyIncrease = salariesIncrease + transportAllowance + socialSecurityEmployer + parafiscales + provisions;
        const costPerEmployee = totalMonthlyIncrease / 2;
        const percentageIncrease = ((totalMonthlyIncrease / (salary * 1.53)) * 100); // 1.53 es el factor de carga prestacional
        
        return `✅ **Simulación completada**

📊 **Impacto de contratar 2 empleados más:**

💰 **Costo Mensual Adicional:** $${fmt(totalMonthlyIncrease)}
📈 **Incremento:** ${percentageIncrease.toFixed(1)}%

💼 **Desglose:**
• Salarios: $${fmt(salariesIncrease)}
• Aux. Transporte: $${fmt(transportAllowance)}
• Seg. Social: $${fmt(socialSecurityEmployer)}
• Parafiscales: $${fmt(parafiscales)}
• Prestaciones: $${fmt(provisions)}

📅 **Proyección 3 meses:** $${fmt(totalMonthlyIncrease * 3)}

💡 **Insight:** Cada empleado nuevo representa un costo mensual de aproximadamente $${fmt(costPerEmployee)} incluyendo todas las prestaciones.

¡Esto es solo una muestra del poder de MAYA! 🚀`;
      },
      quickReplies: [
        { label: '✅ Crear empleado real', value: 'create_employee' },
        { label: '🏠 Ir al dashboard', value: 'go_dashboard' },
        { label: '🔄 Reiniciar demo', value: 'restart' }
      ],
      nextStep: (data, input) => {
        if (input === 'create_employee') {
          data._navigate_url = '/employees?action=new';
          return 'completed';
        }
        if (input === 'go_dashboard') {
          data._navigate_url = '/dashboard';
          return 'completed';
        }
        if (input === 'restart') return 'welcome';
        return 'completed';
      },
      canGoBack: false
    },

    // =========== GENERACIÓN DE PDF ===========
    generating_pdf: {
      id: 'generating_pdf',
      type: FlowStepType.EXECUTION,
      message: `📄 **Generando comprobante PDF...**

🖊️ Creando documento
✍️ Agregando datos del empleado
📊 Insertando cálculos
✨ Aplicando formato profesional

*Generando PDF real...*`,
      nextStep: 'pdf_ready',
      canGoBack: false
    },

    // =========== PDF LISTO ===========
    pdf_ready: {
      id: 'pdf_ready',
      type: FlowStepType.RESULT,
      message: (data) => {
        const result = data._payroll_calculation || {};
        const fmt = (n: any) => new Intl.NumberFormat('es-CO').format(Math.round(Number(n) || 0));
        
        return `✅ **¡Comprobante generado!**

📄 El PDF está listo con todos los detalles de la liquidación.

**Resumen:**
• Empleado: ${data.first_name} ${data.last_name}
• Neto: $${fmt(result.netoPagar)}
• Período: ${data.worked_days_input || 30} días

¿Qué quieres hacer ahora?`;
      },
      quickReplies: [
        { label: '📧 Enviar por email', value: 'send_email' },
        { label: '💾 Descargar PDF', value: 'download_pdf' }
      ],
      nextStep: (data, input) => {
        if (input === 'send_email') return 'email_input';
        if (input === 'download_pdf') return 'downloading_pdf';
        return 'completed';
      },
      canGoBack: false
    },

    // =========== ENVÍO DE EMAIL ===========
    email_input: {
      id: 'email_input',
      type: FlowStepType.INPUT,
      message: '📧 ¿A qué email quieres enviar el comprobante?',
      inputPlaceholder: 'tu@email.com',
      inputType: 'email',
      validationRules: [
        { type: 'required', message: 'Email requerido' },
        { type: 'email', message: 'Email inválido' }
      ],
      nextStep: 'sending_email',
      canGoBack: true
    },

    sending_email: {
      id: 'sending_email',
      type: FlowStepType.EXECUTION,
      message: `📧 **Enviando email...**

Preparando comprobante para envío...`,
      nextStep: 'email_sent',
      canGoBack: false
    },

    email_sent: {
      id: 'email_sent',
      type: FlowStepType.RESULT,
      message: (data) => `✅ **¡Email enviado!**

El comprobante ha sido enviado a **${data.email_input}**

Ahora déjame mostrarte algo más...`,
      quickReplies: [
        { label: '➡️ Continuar', value: 'continue' }
      ],
      nextStep: 'mini_simulator_intro',
      canGoBack: false
    },

    // =========== DESCARGA PDF ===========
    downloading_pdf: {
      id: 'downloading_pdf',
      type: FlowStepType.EXECUTION,
      message: '💾 **Preparando descarga...**',
      nextStep: 'pdf_downloaded',
      canGoBack: false
    },

    pdf_downloaded: {
      id: 'pdf_downloaded',
      type: FlowStepType.RESULT,
      message: '✅ **PDF descargado**\n\nEl comprobante se guardó en tu carpeta de descargas.\n\nAhora déjame mostrarte algo más...',
      quickReplies: [
        { label: '➡️ Continuar', value: 'continue' }
      ],
      nextStep: 'mini_simulator_intro',
      canGoBack: false
    },

    // =========== DEMO COMPLETADO (SKIP SIMULATOR) ===========
    demo_completed: {
      id: 'demo_completed',
      type: FlowStepType.RESULT,
      message: `✨ **¡Demo completado!**

Has visto las capacidades principales de MAYA:
✅ Creación de empleados
✅ Liquidación de nómina en tiempo real
✅ Generación de comprobantes

¿Qué quieres hacer ahora?`,
      quickReplies: [
        { label: '✅ Crear empleado real', value: 'create_employee' },
        { label: '🏠 Ir al dashboard', value: 'go_dashboard' }
      ],
      nextStep: (data, input) => {
        if (input === 'create_employee') {
          data._navigate_url = '/employees?action=new';
          return 'completed';
        }
        data._navigate_url = '/dashboard';
        return 'completed';
      },
      canGoBack: false
    },

    // =========== TRANSICIÓN A EMPLEADO REAL ===========
    transition_to_real: {
      id: 'transition_to_real',
      type: FlowStepType.RESULT,
      message: (data) => `✨ **¡Excelente!**

Ahora voy a ayudarte a registrar a **${data.first_name} ${data.last_name}** como empleado real en tu sistema.

Los datos del demo servirán como base.`,
      quickReplies: [
        { label: '➕ Crear empleado real', value: 'create_real' },
        { label: '❌ Cancelar', value: 'cancel' }
      ],
      nextStep: (data, input) => {
        if (input === 'create_real') {
          // Guardar datos para pre-llenar
          data._transition_to_real_flow = true;
          return 'completed';
        }
        return 'completed';
      },
      canGoBack: false
    },

    // =========== COMPLETADO ===========
    completed: {
      id: 'completed',
      type: FlowStepType.RESULT,
      message: `✅ **¡Demo completada!**

Has visto cómo funciona MAYA de principio a fin. Ahora puedes:

• Crear empleados reales
• Calcular nóminas reales
• Generar comprobantes oficiales

¿Listo para empezar?`,
      quickReplies: [
        { label: '➕ Crear primer empleado', value: 'create_employee' },
        { label: '🏠 Ir al dashboard', value: 'go_dashboard' }
      ],
      nextStep: (data, input) => {
        if (input === 'go_dashboard') {
          data._navigate_url = '/dashboard';
          return 'completed';
        }
        if (input === 'create_employee') {
          data._navigate_url = '/employees';
          return 'completed';
        }
        return 'completed';
      },
      canGoBack: false
    }
  }
};
