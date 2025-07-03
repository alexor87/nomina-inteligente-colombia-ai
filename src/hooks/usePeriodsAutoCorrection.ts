
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriodDetectionRobust } from '@/services/payroll-intelligent/PayrollPeriodDetectionRobust';
import { supabase } from '@/integrations/supabase/client';

interface AutoCorrectionResult {
  correctionsMade: number;
  periodsFixed: string[];
  errors: string[];
  isRunning: boolean;
}

export const usePeriodsAutoCorrection = () => {
  const [correctionResult, setCorrectionResult] = useState<AutoCorrectionResult>({
    correctionsMade: 0,
    periodsFixed: [],
    errors: [],
    isRunning: false
  });
  const { toast } = useToast();

  const runAutoCorrection = useCallback(async (silent = true) => {
    try {
      setCorrectionResult(prev => ({ ...prev, isRunning: true }));
      console.log('🔄 SISTEMA UNIVERSAL: Iniciando auto-corrección...');

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        console.log('❌ SISTEMA UNIVERSAL: No se encontró company_id');
        return;
      }

      // Obtener períodos de la empresa
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ SISTEMA UNIVERSAL: Error obteniendo períodos:', error);
        return;
      }

      if (!periods || periods.length === 0) {
        console.log('ℹ️ SISTEMA UNIVERSAL: No hay períodos para verificar');
        return;
      }

      console.log(`🔍 SISTEMA UNIVERSAL: Verificando ${periods.length} período(s)...`);

      let totalCorrections = 0;
      const periodsFixed: string[] = [];
      const errors: string[] = [];

      // Verificar cada período
      for (const period of periods) {
        try {
          const correctionMade = await correctPeriodIfNeeded(period, companyId);
          if (correctionMade) {
            totalCorrections++;
            periodsFixed.push(period.periodo);
            console.log(`✅ SISTEMA UNIVERSAL: Período "${period.periodo}" corregido`);
          }
        } catch (error) {
          console.error(`❌ SISTEMA UNIVERSAL: Error corrigiendo período ${period.periodo}:`, error);
          errors.push(`Error en ${period.periodo}: ${error.message}`);
        }
      }

      // Actualizar resultado
      setCorrectionResult({
        correctionsMade: totalCorrections,
        periodsFixed,
        errors,
        isRunning: false
      });

      // Notificar si se hicieron correcciones
      if (totalCorrections > 0 && !silent) {
        toast({
          title: "🔧 Auto-corrección Completada",
          description: `Se corrigieron ${totalCorrections} período(s) automáticamente`,
          className: "border-blue-200 bg-blue-50"
        });
      }

      console.log(`✅ SISTEMA UNIVERSAL: Auto-corrección completada - ${totalCorrections} correcciones realizadas`);

    } catch (error) {
      console.error('💥 SISTEMA UNIVERSAL: Error crítico:', error);
      setCorrectionResult(prev => ({
        ...prev,
        isRunning: false,
        errors: [...prev.errors, `Error crítico: ${error.message}`]
      }));
    }
  }, [toast]);

  // Ejecutar auto-corrección al montar el hook
  useEffect(() => {
    runAutoCorrection(true);
  }, [runAutoCorrection]);

  return {
    ...correctionResult,
    runAutoCorrection
  };
};

// Función auxiliar para verificar y corregir un período específico
async function correctPeriodIfNeeded(period: any, companyId: string): Promise<boolean> {
  try {
    // Solo corregir períodos en estado borrador
    if (period.estado !== 'borrador') {
      return false;
    }

    console.log(`🔍 SISTEMA UNIVERSAL: Analizando período "${period.periodo}" (${period.estado})`);

    // Consulta DUAL: buscar nóminas por period_id Y por periodo (texto)
    const { data: payrollsByPeriodId, error: error1 } = await supabase
      .from('payrolls')
      .select('id, estado, employee_id, total_devengado, total_deducciones, neto_pagado')
      .eq('company_id', companyId)
      .eq('period_id', period.id);

    const { data: payrollsByPeriodo, error: error2 } = await supabase
      .from('payrolls')
      .select('id, estado, employee_id, total_devengado, total_deducciones, neto_pagado')
      .eq('company_id', companyId)
      .eq('periodo', period.periodo);

    if (error1 || error2) {
      console.error('❌ SISTEMA UNIVERSAL: Error en consulta dual:', { error1, error2 });
      return false;
    }

    // Combinar resultados eliminando duplicados
    const allPayrolls = [...(payrollsByPeriodId || []), ...(payrollsByPeriodo || [])];
    const uniquePayrolls = allPayrolls.filter((payroll, index, self) =>
      index === self.findIndex(p => p.id === payroll.id)
    );

    console.log(`📊 SISTEMA UNIVERSAL: Encontradas ${uniquePayrolls.length} nómina(s) para "${period.periodo}"`);

    if (uniquePayrolls.length === 0) {
      console.log(`ℹ️ SISTEMA UNIVERSAL: Período "${period.periodo}" sin nóminas - mantener como borrador`);
      return false;
    }

    // Verificar si hay nóminas procesadas
    const processedPayrolls = uniquePayrolls.filter(p => 
      p.estado === 'procesada' || p.estado === 'cerrada' || p.estado === 'pagada'
    );

    if (processedPayrolls.length === 0) {
      console.log(`ℹ️ SISTEMA UNIVERSAL: Período "${period.periodo}" solo tiene nóminas borrador - mantener como borrador`);
      return false;
    }

    console.log(`🚨 SISTEMA UNIVERSAL: INCONSISTENCIA DETECTADA en "${period.periodo}"`);
    console.log(`   - Estado del período: ${period.estado}`);
    console.log(`   - Nóminas procesadas: ${processedPayrolls.length}/${uniquePayrolls.length}`);

    // Calcular totales de nóminas procesadas
    const totalDevengado = processedPayrolls.reduce((sum, p) => sum + (Number(p.total_devengado) || 0), 0);
    const totalDeducciones = processedPayrolls.reduce((sum, p) => sum + (Number(p.total_deducciones) || 0), 0);
    const totalNeto = processedPayrolls.reduce((sum, p) => sum + (Number(p.neto_pagado) || 0), 0);

    // Validar datos
    if (totalDevengado < 0 || totalDeducciones < 0 || totalNeto < 0) {
      console.error(`❌ SISTEMA UNIVERSAL: Datos inválidos para "${period.periodo}" - totales negativos`);
      return false;
    }

    console.log(`💰 SISTEMA UNIVERSAL: Totales calculados para "${period.periodo}":`, {
      empleados: processedPayrolls.length,
      totalDevengado,
      totalDeducciones,
      totalNeto
    });

    // Actualizar período a cerrado
    const { error: updateError } = await supabase
      .from('payroll_periods_real')
      .update({
        estado: 'cerrado',
        empleados_count: processedPayrolls.length,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto,
        updated_at: new Date().toISOString()
      })
      .eq('id', period.id);

    if (updateError) {
      console.error(`❌ SISTEMA UNIVERSAL: Error actualizando período "${period.periodo}":`, updateError);
      return false;
    }

    console.log(`✅ SISTEMA UNIVERSAL: Período "${period.periodo}" corregido exitosamente`);
    console.log(`   ├─ Estado: borrador → cerrado`);
    console.log(`   ├─ Empleados: ${processedPayrolls.length}`);
    console.log(`   ├─ Total devengado: $${totalDevengado.toLocaleString()}`);
    console.log(`   ├─ Total deducciones: $${totalDeducciones.toLocaleString()}`);
    console.log(`   └─ Total neto: $${totalNeto.toLocaleString()}`);

    return true;

  } catch (error) {
    console.error(`💥 SISTEMA UNIVERSAL: Error crítico corrigiendo período "${period.periodo}":`, error);
    return false;
  }
}

// Función auxiliar para obtener company_id
async function getCurrentUserCompanyId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    return profile?.company_id || null;
  } catch (error) {
    console.error('Error getting company ID:', error);
    return null;
  }
}
