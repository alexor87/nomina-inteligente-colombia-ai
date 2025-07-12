
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeFormData } from '@/components/employees/form/types';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataMapper } from '@/services/EmployeeDataMapper';

// Define ValidatedEmployeeData interface to match mapper expectations
interface ValidatedEmployeeData {
  cedula: string;
  tipoDocumento: "CC" | "TI" | "CE" | "PA" | "RC" | "NIT" | "PEP" | "PPT";
  nombre: string;
  apellido: string;
  segundoNombre?: string;
  email?: string;
  telefono?: string;
  sexo?: "M" | "F" | "O";
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  salarioBase: number;
  tipoContrato: "indefinido" | "fijo" | "obra" | "aprendizaje";
  fechaIngreso: string;
  periodicidadPago: "mensual" | "quincenal";
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: "I" | "II" | "III" | "IV" | "V";
  estado: "activo" | "inactivo" | "vacaciones" | "incapacidad";
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: "completa" | "parcial" | "horas";
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  banco?: string;
  tipoCuenta: "ahorros" | "corriente";
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: "dispersion" | "manual";
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: "contributivo" | "subsidiado";
  estadoAfiliacion: "completa" | "pendiente" | "inconsistente";
  customFields?: Record<string, any>;
}

export const useEmployeeFormSubmissionRobust = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitEmployee = async (data: EmployeeFormData): Promise<{ success: boolean; employeeId?: string; error?: string }> => {
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Iniciando envío de empleado con datos:', data);

      // Obtener company_id del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // ✅ FIXED: Create a compatible data object with proper field mapping and type casting
      const compatibleData: ValidatedEmployeeData = {
        cedula: data.cedula,
        tipoDocumento: (data.tipoDocumento || 'CC') as "CC" | "TI" | "CE" | "PA" | "RC" | "NIT" | "PEP" | "PPT",
        nombre: data.nombre,
        apellido: data.apellido,
        segundoNombre: data.segundoNombre,
        email: data.email,
        telefono: data.telefono,
        sexo: (data.sexo || 'M') as "M" | "F" | "O",
        fechaNacimiento: data.fechaNacimiento,
        direccion: data.direccion,
        ciudad: data.ciudad,
        departamento: data.departamento,
        salarioBase: data.salarioBase || 0,
        tipoContrato: (data.tipoContrato || 'indefinido') as "indefinido" | "fijo" | "obra" | "aprendizaje",
        fechaIngreso: data.fechaIngreso,
        periodicidadPago: (data.periodicidadPago || 'mensual') as "mensual" | "quincenal",
        cargo: data.cargo,
        codigoCIIU: data.codigoCiiu, // Map from form field name to expected mapper field name
        nivelRiesgoARL: (data.nivelRiesgoArl || 'I') as "I" | "II" | "III" | "IV" | "V", // Map from form field name to expected mapper field name
        estado: (data.estado || 'activo') as "activo" | "inactivo" | "vacaciones" | "incapacidad",
        centroCostos: data.centroCostos,
        fechaFirmaContrato: data.fechaFirmaContrato,
        fechaFinalizacionContrato: data.fechaFinalizacionContrato,
        tipoJornada: (data.tipoJornada || 'completa') as "completa" | "parcial" | "horas",
        diasTrabajo: data.diasTrabajo,
        horasTrabajo: data.horasTrabajo,
        beneficiosExtralegales: data.beneficiosExtralegales,
        clausulasEspeciales: data.clausulasEspeciales,
        banco: data.banco,
        tipoCuenta: (data.tipoCuenta || 'ahorros') as "ahorros" | "corriente",
        numeroCuenta: data.numeroCuenta,
        titularCuenta: data.titularCuenta,
        formaPago: (data.formaPago || 'dispersion') as "dispersion" | "manual",
        eps: data.eps,
        afp: data.afp,
        arl: data.arl,
        cajaCompensacion: data.cajaCompensacion,
        tipoCotizanteId: data.tipoCotizanteId,
        subtipoCotizanteId: data.subtipoCotizanteId,
        regimenSalud: (data.regimenSalud || 'contributivo') as "contributivo" | "subsidiado",
        estadoAfiliacion: (data.estadoAfiliacion || 'pendiente') as "completa" | "pendiente" | "inconsistente",
        customFields: data.customFields || {}
      };

      // ✅ KISS: Use EmployeeDataMapper for proper field conversion
      const mappedData = EmployeeDataMapper.mapFormToDatabase(compatibleData, profile.company_id);
      
      console.log('📝 Datos mapeados para base de datos:', mappedData);

      let result;
      let actionText;

      if (data.id) {
        console.log('📝 Actualizando empleado existente:', data.id);
        const { data: updateResult, error } = await supabase
          .from('employees')
          .update(mappedData)
          .eq('id', data.id)
          .select()
          .single();
        
        result = updateResult;
        actionText = 'actualizado';
        
        if (error) throw error;
      } else {
        console.log('➕ Creando nuevo empleado');
        const { data: insertResult, error } = await supabase
          .from('employees')
          .insert(mappedData)
          .select()
          .single();
        
        result = insertResult;
        actionText = 'creado';
        
        if (error) throw error;
      }

      console.log(`✅ Empleado ${actionText} exitosamente:`, result);

      toast({
        title: `Empleado ${actionText} ✅`,
        description: `${data.nombre} ${data.apellido} ha sido ${actionText} exitosamente`,
        className: "border-green-200 bg-green-50"
      });

      return { 
        success: true, 
        employeeId: result?.id 
      };

    } catch (error: any) {
      console.error('💥 Error en submitEmployee:', error);
      
      const errorMessage = error.message || 'Error desconocido al procesar empleado';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      return { 
        success: false, 
        error: errorMessage 
      };

    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEmployee,
    isSubmitting
  };
};
