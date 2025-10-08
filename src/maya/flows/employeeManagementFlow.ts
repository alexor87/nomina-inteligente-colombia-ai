import { GuidedFlow, FlowType, FlowStepType } from '../types/GuidedFlow';

export const employeeManagementFlow: GuidedFlow = {
  id: FlowType.EMPLOYEE_CREATE,
  name: 'Gestión de Empleados',
  description: 'Asistente para crear nuevos empleados paso a paso',
  icon: '👥',
  initialStep: 'greeting',
  completedStep: 'result',
  
  steps: {
    // 1. GREETING
    greeting: {
      id: 'greeting',
      type: FlowStepType.GREETING,
      message: '¡Perfecto! Voy a ayudarte a crear un nuevo empleado. Solo necesito algunos datos básicos y luego puedes agregar más información si lo deseas. 📋',
      quickReplies: [
        { label: '✨ Empezar', value: 'start' },
        { label: '❌ Cancelar', value: 'cancel' }
      ],
      nextStep: (data, input) => input === 'cancel' ? 'cancelled' : 'document_type',
      canGoBack: false
    },

    // 2. DOCUMENT TYPE
    document_type: {
      id: 'document_type',
      type: FlowStepType.SELECT,
      message: '¿Qué tipo de documento tiene el empleado?',
      quickReplies: [
        { label: '🪪 CC - Cédula de Ciudadanía', value: 'CC' },
        { label: '🎫 TI - Tarjeta de Identidad', value: 'TI' },
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

    // 3. DOCUMENT NUMBER
    document_number: {
      id: 'document_number',
      type: FlowStepType.INPUT,
      message: (data) => `Perfecto. ¿Cuál es el número de ${data.document_type || 'documento'}?`,
      inputPlaceholder: 'Ejemplo: 1234567890',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El número de documento es obligatorio' },
        { type: 'minLength', value: 1, message: 'Debe tener al menos 1 carácter' },
        { type: 'maxLength', value: 20, message: 'No puede exceder 20 caracteres' },
        { type: 'pattern', value: /^[0-9]+$/, message: 'Solo se permiten números' }
      ],
      nextStep: 'first_name',
      canGoBack: true
    },

    // 4. FIRST NAME
    first_name: {
      id: 'first_name',
      type: FlowStepType.INPUT,
      message: '¿Cuál es el primer nombre del empleado?',
      inputPlaceholder: 'Ejemplo: Juan',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El nombre es obligatorio' },
        { type: 'minLength', value: 1, message: 'Debe tener al menos 1 carácter' },
        { type: 'maxLength', value: 30, message: 'No puede exceder 30 caracteres' },
        { 
          type: 'custom', 
          message: 'Solo se permiten letras y espacios',
          validator: (input) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(input)
        }
      ],
      nextStep: 'last_name',
      canGoBack: true
    },

    // 5. LAST NAME
    last_name: {
      id: 'last_name',
      type: FlowStepType.INPUT,
      message: '¿Y el apellido?',
      inputPlaceholder: 'Ejemplo: Pérez',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El apellido es obligatorio' },
        { type: 'minLength', value: 1, message: 'Debe tener al menos 1 carácter' },
        { type: 'maxLength', value: 30, message: 'No puede exceder 30 caracteres' },
        { 
          type: 'custom', 
          message: 'Solo se permiten letras y espacios',
          validator: (input) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(input)
        }
      ],
      nextStep: 'second_name_optional',
      canGoBack: true
    },

    // 6. SECOND NAME (OPTIONAL)
    second_name_optional: {
      id: 'second_name_optional',
      type: FlowStepType.SELECT,
      message: '¿Tiene segundo nombre? (opcional)',
      quickReplies: [
        { label: '✅ Sí, agregar', value: 'yes' },
        { label: '⏭️ No, continuar', value: 'no' }
      ],
      nextStep: (data, input) => input === 'yes' ? 'second_name_input' : 'salary',
      canGoBack: true,
      canSkip: true,
      skipToStep: 'salary'
    },

    // 7. SECOND NAME INPUT
    second_name_input: {
      id: 'second_name_input',
      type: FlowStepType.INPUT,
      message: '¿Cuál es el segundo nombre?',
      inputPlaceholder: 'Ejemplo: Carlos',
      inputType: 'text',
      validationRules: [
        { type: 'maxLength', value: 30, message: 'No puede exceder 30 caracteres' },
        { 
          type: 'custom', 
          message: 'Solo se permiten letras y espacios',
          validator: (input) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(input)
        }
      ],
      nextStep: 'salary',
      canGoBack: true
    },

    // 8. SALARY
    salary: {
      id: 'salary',
      type: FlowStepType.INPUT,
      message: (data) => `¿Cuál es el salario base de ${data.first_name}?`,
      inputPlaceholder: 'Ejemplo: 1423500',
      inputType: 'number',
      quickReplies: [
        { label: '💰 $1,423,500 (Mínimo)', value: '1423500' },
        { label: '💵 $2,000,000', value: '2000000' },
        { label: '💸 $3,000,000', value: '3000000' },
        { label: '✏️ Otro monto', value: 'custom' }
      ],
      validationRules: [
        { type: 'required', message: 'El salario es obligatorio' },
        { type: 'min', value: 1423500, message: 'No puede ser menor al salario mínimo ($1,423,500)' },
        { type: 'max', value: 100000000, message: 'El monto parece muy alto, verifica' }
      ],
      nextStep: 'contract_type',
      canGoBack: true
    },

    // 9. CONTRACT TYPE
    contract_type: {
      id: 'contract_type',
      type: FlowStepType.SELECT,
      message: '¿Qué tipo de contrato tiene?',
      quickReplies: [
        { label: '📄 Indefinido', value: 'indefinido' },
        { label: '📅 Término Fijo', value: 'fijo' },
        { label: '🔨 Obra o Labor', value: 'obra_labor' },
        { label: '🎓 Aprendizaje', value: 'aprendizaje' }
      ],
      nextStep: 'start_date',
      canGoBack: true
    },

    // 10. START DATE
    start_date: {
      id: 'start_date',
      type: FlowStepType.INPUT,
      message: '¿Cuál es la fecha de ingreso? (formato: YYYY-MM-DD)',
      inputPlaceholder: 'Ejemplo: 2024-01-15',
      inputType: 'date',
      quickReplies: [
        { label: '📅 Hoy', value: new Date().toISOString().split('T')[0] },
        { label: '✏️ Otra fecha', value: 'custom' }
      ],
      validationRules: [
        { type: 'required', message: 'La fecha de ingreso es obligatoria' },
        { 
          type: 'custom', 
          message: 'La fecha no puede ser futura',
          validator: (input) => new Date(input) <= new Date()
        }
      ],
      nextStep: 'payment_frequency',
      canGoBack: true
    },

    // 11. PAYMENT FREQUENCY
    payment_frequency: {
      id: 'payment_frequency',
      type: FlowStepType.SELECT,
      message: '¿Con qué frecuencia se le paga?',
      quickReplies: [
        { label: '📅 Mensual', value: 'mensual' },
        { label: '📆 Quincenal', value: 'quincenal' }
      ],
      nextStep: 'optional_data',
      canGoBack: true
    },

    // 12. OPTIONAL DATA HUB
    optional_data: {
      id: 'optional_data',
      type: FlowStepType.HUB,
      message: (data) => `¡Excelente! Ya tengo los datos básicos de **${data.first_name} ${data.last_name}**. ¿Quieres agregar información adicional ahora o prefieres hacerlo después?`,
      quickReplies: [
        { label: '✉️ Email y teléfono', value: 'email_phone_flow' },
        { label: '💼 Cargo', value: 'position_flow' },
        { label: '🏦 Datos bancarios', value: 'banking_flow' },
        { label: '🏥 Afiliaciones', value: 'affiliations_flow' },
        { label: '✅ Crear empleado', value: 'preview' },
        { label: '📋 Ver resumen', value: 'preview' }
      ],
      nextStep: (data, input) => {
        if (input === 'preview') return 'preview';
        if (input === 'email_phone_flow') return 'email_input';
        if (input === 'position_flow') return 'position_input';
        if (input === 'banking_flow') return 'bank_select';
        if (input === 'affiliations_flow') return 'eps_input';
        return 'preview';
      },
      canGoBack: true
    },

    // === EMAIL & PHONE SUB-FLOW ===
    email_input: {
      id: 'email_input',
      type: FlowStepType.INPUT,
      message: '¿Cuál es el email del empleado? (opcional)',
      inputPlaceholder: 'ejemplo@empresa.com',
      inputType: 'email',
      validationRules: [
        { 
          type: 'custom', 
          message: 'Formato de email inválido',
          validator: (input) => !input || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
        }
      ],
      nextStep: 'phone_input',
      canGoBack: true,
      canSkip: true,
      skipToStep: 'phone_input'
    },

    phone_input: {
      id: 'phone_input',
      type: FlowStepType.INPUT,
      message: '¿Y el teléfono? (opcional)',
      inputPlaceholder: '3001234567',
      inputType: 'text',
      validationRules: [
        { type: 'maxLength', value: 15, message: 'Máximo 15 dígitos' },
        { 
          type: 'custom', 
          message: 'Solo números',
          validator: (input) => !input || /^[0-9]+$/.test(input)
        }
      ],
      nextStep: 'optional_data',
      canGoBack: true,
      canSkip: true,
      skipToStep: 'optional_data'
    },

    // === POSITION SUB-FLOW ===
    position_input: {
      id: 'position_input',
      type: FlowStepType.INPUT,
      message: '¿Cuál es el cargo del empleado?',
      inputPlaceholder: 'Ejemplo: Desarrollador',
      inputType: 'text',
      validationRules: [
        { type: 'maxLength', value: 50, message: 'Máximo 50 caracteres' }
      ],
      nextStep: 'arl_level_select',
      canGoBack: true
    },

    arl_level_select: {
      id: 'arl_level_select',
      type: FlowStepType.SELECT,
      message: '¿Qué nivel de riesgo ARL tiene?',
      quickReplies: [
        { label: 'I - Riesgo mínimo', value: 'I' },
        { label: 'II - Riesgo bajo', value: 'II' },
        { label: 'III - Riesgo medio', value: 'III' },
        { label: 'IV - Riesgo alto', value: 'IV' },
        { label: 'V - Riesgo máximo', value: 'V' }
      ],
      nextStep: 'optional_data',
      canGoBack: true
    },

    // === BANKING SUB-FLOW ===
    bank_select: {
      id: 'bank_select',
      type: FlowStepType.SELECT,
      message: '¿En qué banco tiene cuenta el empleado?',
      quickReplies: [
        { label: '🏦 Bancolombia', value: 'bancolombia' },
        { label: '🏦 Davivienda', value: 'davivienda' },
        { label: '🏦 BBVA', value: 'bbva' },
        { label: '🏦 Banco de Bogotá', value: 'banco_bogota' },
        { label: '✏️ Otro', value: 'custom' }
      ],
      nextStep: 'account_type_select',
      canGoBack: true
    },

    account_type_select: {
      id: 'account_type_select',
      type: FlowStepType.SELECT,
      message: '¿Qué tipo de cuenta es?',
      quickReplies: [
        { label: '💰 Ahorros', value: 'ahorros' },
        { label: '🏦 Corriente', value: 'corriente' }
      ],
      nextStep: 'account_number_input',
      canGoBack: true
    },

    account_number_input: {
      id: 'account_number_input',
      type: FlowStepType.INPUT,
      message: '¿Cuál es el número de cuenta?',
      inputPlaceholder: '1234567890',
      inputType: 'text',
      validationRules: [
        { type: 'required', message: 'El número de cuenta es obligatorio' },
        { 
          type: 'custom', 
          message: 'Solo números, sin espacios',
          validator: (input) => /^[0-9]+$/.test(input)
        }
      ],
      nextStep: 'optional_data',
      canGoBack: true
    },

    // === AFFILIATIONS SUB-FLOW ===
    eps_input: {
      id: 'eps_input',
      type: FlowStepType.INPUT,
      message: '¿A qué EPS está afiliado? (opcional)',
      inputPlaceholder: 'Ejemplo: Salud Total',
      inputType: 'text',
      nextStep: 'afp_input',
      canGoBack: true,
      canSkip: true,
      skipToStep: 'afp_input'
    },

    afp_input: {
      id: 'afp_input',
      type: FlowStepType.INPUT,
      message: '¿A qué AFP? (opcional)',
      inputPlaceholder: 'Ejemplo: Porvenir',
      inputType: 'text',
      nextStep: 'arl_input',
      canGoBack: true,
      canSkip: true,
      skipToStep: 'arl_input'
    },

    arl_input: {
      id: 'arl_input',
      type: FlowStepType.INPUT,
      message: '¿A qué ARL? (opcional)',
      inputPlaceholder: 'Ejemplo: Sura',
      inputType: 'text',
      nextStep: 'optional_data',
      canGoBack: true,
      canSkip: true,
      skipToStep: 'optional_data'
    },

    // 13. PREVIEW
    preview: {
      id: 'preview',
      type: FlowStepType.PREVIEW,
      message: (data) => `Aquí está el resumen del empleado que vas a crear:

**Datos Personales**
• Documento: ${data.document_type} ${data.document_number}
• Nombre: ${data.first_name}${data.second_name ? ` ${data.second_name}` : ''} ${data.last_name}
${data.email ? `• Email: ${data.email}` : ''}
${data.phone ? `• Teléfono: ${data.phone}` : ''}

**Datos Laborales**
• Salario: $${Number(data.salary).toLocaleString('es-CO')}
• Contrato: ${data.contract_type}
• Fecha ingreso: ${data.start_date}
• Periodicidad pago: ${data.payment_frequency}
${data.position ? `• Cargo: ${data.position}` : ''}
${data.arl_level ? `• Nivel ARL: ${data.arl_level}` : ''}

${data.bank ? `**Datos Bancarios**
• Banco: ${data.bank}
• Tipo cuenta: ${data.account_type}
• Número cuenta: ${data.account_number}
` : ''}
${data.eps || data.afp || data.arl ? `**Afiliaciones**
${data.eps ? `• EPS: ${data.eps}` : ''}
${data.afp ? `• AFP: ${data.afp}` : ''}
${data.arl ? `• ARL: ${data.arl}` : ''}
` : ''}`,
      quickReplies: [
        { label: '✅ Confirmar y crear', value: 'confirm' },
        { label: '✏️ Editar datos', value: 'edit' },
        { label: '❌ Cancelar', value: 'cancel' }
      ],
      nextStep: (data, input) => {
        if (input === 'confirm') return 'execution';
        if (input === 'edit') return 'optional_data';
        return 'cancelled';
      },
      canGoBack: true
    },

    // 14. EXECUTION
    execution: {
      id: 'execution',
      type: FlowStepType.EXECUTION,
      message: 'Creando empleado... ⏳',
      quickReplies: [],
      nextStep: 'result',
      canGoBack: false
    },

    // 15. RESULT
    result: {
      id: 'result',
      type: FlowStepType.RESULT,
      message: (data) => {
        const name = `${data.first_name} ${data.last_name}`;
        const executionResult = data._executionResult || {};
        const salary = Number(data.salary).toLocaleString('es-CO');
        
        return `✅ **¡Empleado creado exitosamente!**

**${name}** ha sido agregado a tu empresa.

📄 **Documento:** ${data.document_type} ${data.document_number}
💰 **Salario:** $${salary}
📅 **Fecha de ingreso:** ${data.start_date}
📋 **Contrato:** ${data.contract_type}

El empleado ya está visible en el módulo de empleados.`;
      },
      quickReplies: [
        { label: '📋 Ver en lista de empleados', value: 'go_to_employees' },
        { label: '➕ Crear otro empleado', value: 'create_another' },
        { label: '✅ Listo', value: 'completed' }
      ],
      nextStep: (data, input) => {
        if (input === 'go_to_employees') {
          // Trigger navigation
          setTimeout(() => {
            window.location.href = '/modules/employees';
          }, 500);
          return 'completed';
        }
        if (input === 'create_another') {
          return 'greeting';
        }
        return 'completed';
      },
      canGoBack: false
    },

    // CANCELLED
    cancelled: {
      id: 'cancelled',
      type: FlowStepType.RESULT,
      message: 'Operación cancelada. No se ha creado ningún empleado.',
      quickReplies: [
        { label: '🔄 Volver a intentar', value: 'restart' },
        { label: '🏠 Volver al inicio', value: 'home' }
      ],
      nextStep: 'completed',
      canGoBack: false
    },

    // COMPLETED
    completed: {
      id: 'completed',
      type: FlowStepType.RESULT,
      message: 'Flujo completado.',
      quickReplies: [],
      nextStep: 'completed',
      canGoBack: false
    }
  }
};
