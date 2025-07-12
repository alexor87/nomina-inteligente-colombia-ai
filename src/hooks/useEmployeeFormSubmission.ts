
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeFormData } from '@/components/employees/form/types';
import { EmployeeUnified } from '@/types/employee-unified';
import { useEmployeeCRUD } from './useEmployeeCRUD';

export const useEmployeeFormSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { createEmployee, updateEmployee } = useEmployeeCRUD();

  const mapFormDataToEmployee = (formData: EmployeeFormData, companyId: string): Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'> => {
    return {
      company_id: companyId,
      cedula: formData.cedula,
      tipoDocumento: formData.tipoDocumento as string,
      nombre: formData.nombre,
      segundoNombre: formData.segundoNombre,
      apellido: formData.apellido,
      email: formData.email,
      telefono: formData.telefono,
      sexo: formData.sexo as string,
      fechaNacimiento: formData.fechaNacimiento,
      direccion: formData.direccion,
      ciudad: formData.ciudad,
      departamento: formData.departamento,
      salarioBase: Number(formData.salarioBase),
      tipoContrato: formData.tipoContrato as string,
      fechaIngreso: formData.fechaIngreso,
      periodicidadPago: formData.periodicidadPago as string,
      cargo: formData.cargo,
      codigoCiiu: formData.codigoCiiu,
      nivelRiesgoArl: formData.nivelRiesgoArl,
      estado: formData.estado as any,
      centroCostos: formData.centroCostos,
      fechaFirmaContrato: formData.fechaFirmaContrato,
      fechaFinalizacionContrato: formData.fechaFinalizacionContrato,
      tipoJornada: formData.tipoJornada as string,
      diasTrabajo: formData.diasTrabajo,
      horasTrabajo: formData.horasTrabajo,
      beneficiosExtralegales: formData.beneficiosExtralegales,
      clausulasEspeciales: formData.clausulasEspeciales,
      banco: formData.banco,
      tipoCuenta: formData.tipoCuenta as string,
      numeroCuenta: formData.numeroCuenta,
      titularCuenta: formData.titularCuenta,
      formaPago: formData.formaPago as string,
      eps: formData.eps,
      afp: formData.afp,
      arl: formData.arl,
      cajaCompensacion: formData.cajaCompensacion,
      tipoCotizanteId: formData.tipoCotizanteId,
      subtipoCotizanteId: formData.subtipoCotizanteId,
      regimenSalud: formData.regimenSalud as string,
      estadoAfiliacion: formData.estadoAfiliacion as string,
      customFields: formData.customFields || {}
    };
  };

  const submitEmployeeForm = async (
    formData: EmployeeFormData,
    companyId: string,
    existingEmployee?: EmployeeUnified
  ) => {
    setIsSubmitting(true);
    
    try {
      const employeeData = mapFormDataToEmployee(formData, companyId);
      
      let result;
      if (existingEmployee) {
        result = await updateEmployee(existingEmployee.id, employeeData as Partial<EmployeeUnified>);
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
