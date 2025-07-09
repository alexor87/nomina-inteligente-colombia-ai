
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeFormData } from '@/components/employees/form/types';
import { Employee } from '@/types';
import { useEmployeeCRUD } from './useEmployeeCRUD';

export const useEmployeeFormSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { createEmployee, updateEmployee } = useEmployeeCRUD();

  const mapFormDataToEmployee = (formData: EmployeeFormData, companyId: string): Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> => {
    return {
      empresaId: companyId,
      cedula: formData.cedula,
      tipoDocumento: formData.tipoDocumento,
      nombre: formData.nombre,
      segundoNombre: formData.segundoNombre,
      apellido: formData.apellido,
      email: formData.email,
      telefono: formData.telefono,
      sexo: formData.sexo,
      fechaNacimiento: formData.fechaNacimiento,
      direccion: formData.direccion,
      ciudad: formData.ciudad,
      departamento: formData.departamento,
      salarioBase: Number(formData.salarioBase),
      // ✅ Map form values to Employee type values
      tipoContrato: formData.tipoContrato === 'obra_labor' ? 'obra' : 
                   formData.tipoContrato === 'practicas' ? 'aprendizaje' :
                   formData.tipoContrato as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje',
      fechaIngreso: formData.fechaIngreso,
      periodicidadPago: formData.periodicidadPago === 'semanal' ? 'quincenal' : 
                       formData.periodicidadPago as 'mensual' | 'quincenal',
      cargo: formData.cargo,
      codigoCIIU: formData.codigo_ciiu,
      nivelRiesgoARL: formData.nivelRiesgoARL,
      estado: formData.estado === 'licencia' ? 'inactivo' : 
             formData.estado as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad',
      centroCostos: formData.centroCostos,
      fechaFirmaContrato: formData.fechaFirmaContrato,
      fechaFinalizacionContrato: formData.fechaFinalizacionContrato,
      // ✅ Map tipoJornada values
      tipoJornada: formData.tipoJornada === 'medio_tiempo' ? 'parcial' : 
                  formData.tipoJornada === 'por_horas' ? 'horas' : 
                  formData.tipoJornada === 'flexible' ? 'parcial' : 'completa',
      diasTrabajo: formData.diasTrabajo,
      horasTrabajo: formData.horasTrabajo,
      beneficiosExtralegales: formData.beneficiosExtralegales,
      clausulasEspeciales: formData.clausulasEspeciales,
      banco: formData.banco,
      tipoCuenta: formData.tipoCuenta,
      numeroCuenta: formData.numeroCuenta,
      titularCuenta: formData.titularCuenta,
      formaPago: formData.formaPago,
      eps: formData.eps,
      afp: formData.afp,
      arl: formData.arl,
      cajaCompensacion: formData.cajaCompensacion,
      tipoCotizanteId: formData.tipoCotizanteId,
      subtipoCotizanteId: formData.subtipoCotizanteId,
      regimenSalud: formData.regimenSalud,
      estadoAfiliacion: formData.estadoAfiliacion
    };
  };

  const submitEmployeeForm = async (
    formData: EmployeeFormData,
    companyId: string,
    existingEmployee?: Employee
  ) => {
    setIsSubmitting(true);
    
    try {
      const employeeData = mapFormDataToEmployee(formData, companyId);
      
      let result;
      if (existingEmployee) {
        result = await updateEmployee(existingEmployee.id, employeeData as Partial<Employee>);
      } else {
        result = await createEmployee(employeeData);
      }

      if (result.success) {
        toast({
          title: "✅ Empleado guardado",
          description: `El empleado ${formData.nombre} ${formData.apellido} ha sido ${existingEmployee ? 'actualizado' : 'creado'} correctamente`,
          className: "border-green-200 bg-green-50"
        });
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error submitting employee form:', error);
      toast({
        title: "❌ Error al guardar empleado",
        description: error instanceof Error ? error.message : 'No se pudo guardar el empleado',
        variant: "destructive"
      });
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEmployeeForm,
    isSubmitting
  };
};
