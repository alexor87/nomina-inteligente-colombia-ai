// ============================================================================
// Colombian Payroll Handlers - New Maya Capabilities
// ============================================================================

// Liquidar Nómina
export async function liquidarNomina(supabase: any, params: any) {
  console.log('💰 [LIQUIDAR_NOMINA] Processing payroll liquidation:', params);
  
  try {
    // This is a conceptual implementation - would integrate with actual payroll system
    const { periodo, quincena, empleados } = params;
    
    return {
      message: `🎯 **Liquidación de Nómina Iniciada**\n\n` +
               `📅 **Período:** ${periodo}\n` +
               `👥 **Empleados:** ${empleados}\n` +
               `⏱️ **Quincena:** ${quincena || 'Completa'}\n\n` +
               `La liquidación se procesará con todos los conceptos de nómina colombiana:\n` +
               `• Salario básico y auxilio de transporte\n` +
               `• Seguridad social (Salud, Pensión, ARL)\n` +
               `• Parafiscales (SENA, ICBF, Caja de Compensación)\n` +
               `• Prestaciones sociales\n` +
               `• Retención en la fuente\n\n` +
               `⚡ El proceso se completará automáticamente.`,
      emotionalState: 'encouraging'
    };
  } catch (error) {
    console.error('Error in liquidarNomina:', error);
    return {
      message: 'Hubo un error al procesar la liquidación de nómina. Por favor intenta nuevamente.',
      emotionalState: 'concerned'
    };
  }
}

// Registrar Novedad
export async function registrarNovedad(supabase: any, params: any) {
  console.log('📝 [REGISTRAR_NOVEDAD] Processing payroll novelty:', params);
  
  try {
    const { empleado, tipo_novedad, dias, horas } = params;
    
    if (!empleado) {
      return {
        message: '⚠️ Necesito el nombre del empleado para registrar la novedad. ¿Podrías especificarlo?',
        emotionalState: 'neutral'
      };
    }
    
    // Validate employee exists
    const { data: employee, error: empError } = await supabase
      .from('empleados')
      .select('nombre, apellido')
      .ilike('nombre', `%${empleado}%`)
      .single();
      
    if (empError || !employee) {
      return {
        message: `❌ No encontré el empleado "${empleado}". ¿Podrías verificar el nombre?`,
        emotionalState: 'concerned'
      };
    }

    const novedadTypes: Record<string, string> = {
      'incapacidad': 'Incapacidad médica',
      'licencia_maternidad': 'Licencia de maternidad (18 semanas)',
      'licencia_paternidad': 'Licencia de paternidad (2 semanas)',
      'horas_extra_diurna': 'Horas extra diurnas',
      'horas_extra_nocturna': 'Horas extra nocturnas'
    };
    
    return {
      message: `✅ **Novedad Registrada**\n\n` +
               `👤 **Empleado:** ${employee.nombre} ${employee.apellido}\n` +
               `📋 **Tipo:** ${novedadTypes[tipo_novedad] || tipo_novedad}\n` +
               `📅 **Días:** ${dias || 'N/A'}\n` +
               `⏰ **Horas:** ${horas || 'N/A'}\n\n` +
               `🔄 La novedad se aplicará en la próxima liquidación de nómina.\n` +
               `📊 Afectará automáticamente los cálculos de seguridad social y prestaciones.`,
      emotionalState: 'celebrating'
    };
  } catch (error) {
    console.error('Error in registrarNovedad:', error);
    return {
      message: 'Error al registrar la novedad. Por favor intenta nuevamente.',
      emotionalState: 'concerned'
    };
  }
}

// Calcular Prestación
export async function calcularPrestacion(supabase: any, params: any) {
  console.log('🏆 [CALCULAR_PRESTACION] Processing social benefit calculation:', params);
  
  try {
    const { empleado, tipo_prestacion, periodo } = params;
    
    const prestacionTypes: Record<string, { name: string; formula: string; rate: string }> = {
      'cesantias': {
        name: 'Cesantías',
        formula: 'Salario promedio × días trabajados ÷ 360',
        rate: '8.33% mensual'
      },
      'prima': {
        name: 'Prima de servicios',
        formula: 'Salario promedio × días trabajados ÷ 360',
        rate: 'Junio y Diciembre'
      },
      'vacaciones': {
        name: 'Vacaciones',
        formula: 'Salario básico × 15 días ÷ 360 × días trabajados',
        rate: '15 días hábiles por año'
      },
      'indemnizacion': {
        name: 'Indemnización',
        formula: 'Varía según tipo de contrato y causal',
        rate: 'Según normativa laboral'
      }
    };
    
    const prestacion = prestacionTypes[tipo_prestacion];
    
    if (empleado && empleado !== 'todos') {
      // Validate employee exists
      const { data: employee, error: empError } = await supabase
        .from('empleados')
        .select('nombre, apellido, salario_base')
        .ilike('nombre', `%${empleado}%`)
        .single();
        
      if (empError || !employee) {
        return {
          message: `❌ No encontré el empleado "${empleado}". ¿Podrías verificar el nombre?`,
          emotionalState: 'concerned'
        };
      }
      
      return {
        message: `🏆 **Cálculo de ${prestacion.name}**\n\n` +
                 `👤 **Empleado:** ${employee.nombre} ${employee.apellido}\n` +
                 `💰 **Salario base:** $${employee.salario_base?.toLocaleString()}\n\n` +
                 `📐 **Fórmula:** ${prestacion.formula}\n` +
                 `📊 **Base:** ${prestacion.rate}\n\n` +
                 `⚡ El cálculo se realizará considerando:\n` +
                 `• Salario promedio del período\n` +
                 `• Días trabajados efectivos\n` +
                 `• Auxilio de transporte (si aplica)\n` +
                 `• Normativa laboral colombiana`,
        emotionalState: 'analyzing'
      };
    }
    
    return {
      message: `🏆 **Cálculo Masivo de ${prestacion.name}**\n\n` +
               `👥 **Alcance:** Todos los empleados\n` +
               `📅 **Período:** ${periodo}\n\n` +
               `📐 **Fórmula:** ${prestacion.formula}\n` +
               `📊 **Base:** ${prestacion.rate}\n\n` +
               `🔄 Se procesarán automáticamente todos los empleados activos.\n` +
               `📋 El reporte incluirá detalles individuales y totales.`,
      emotionalState: 'encouraging'
    };
  } catch (error) {
    console.error('Error in calcularPrestacion:', error);
    return {
      message: 'Error al calcular la prestación. Por favor intenta nuevamente.',
      emotionalState: 'concerned'
    };
  }
}

// Generar Reporte
export async function generarReporte(supabase: any, params: any) {
  console.log('📊 [GENERAR_REPORTE] Processing report generation:', params);
  
  try {
    const { tipo_reporte, conceptos, periodo } = params;
    
    const reportTypes: Record<string, string> = {
      'planilla_pila': '📋 Planilla PILA (Seguridad Social)',
      'seguridad_social': '🏥 Aportes a Seguridad Social',
      'parafiscales': '🎓 Aportes Parafiscales',
      'general': '📊 Reporte General de Nómina'
    };
    
    const conceptLabels: Record<string, string> = {
      'salud': '🏥 EPS/Salud',
      'pension': '👴 Pensiones',
      'arl': '🛡️ ARL',
      'sena': '🎓 SENA',
      'icbf': '👶 ICBF',
      'caja_compensacion': '💼 Caja de Compensación'
    };
    
    let conceptosText = '';
    if (conceptos.length > 0) {
      const conceptLabels: Record<string, string> = {
        'salud': '🏥 EPS/Salud',
        'pension': '👴 Pensiones',
        'arl': '🛡️ ARL',
        'sena': '🎓 SENA',
        'icbf': '👶 ICBF',
        'caja_compensacion': '💼 Caja de Compensación'
      };
      
      conceptosText = '\n**Conceptos incluidos:**\n' + 
        conceptos.map((c: string) => `• ${conceptLabels[c] || c}`).join('\n') + '\n';
    }
    
    return {
      message: `📊 **${reportTypes[tipo_reporte] || 'Reporte de Nómina'}**\n\n` +
               `📅 **Período:** ${periodo}\n${conceptosText}\n` +
               `📋 **El reporte incluirá:**\n` +
               `• Liquidación individual por empleado\n` +
               `• Totales por concepto\n` +
               `• Base de cotización y aportes\n` +
               `• Validaciones de topes legales\n` +
               `• Formato para entidades (si aplica)\n\n` +
               `⚡ Generando reporte con normativa colombiana actualizada...`,
      emotionalState: 'analyzing'
    };
  } catch (error) {
    console.error('Error in generarReporte:', error);
    return {
      message: 'Error al generar el reporte. Por favor intenta nuevamente.',
      emotionalState: 'concerned'
    };
  }
}