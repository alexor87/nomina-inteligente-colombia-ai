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
      tipoDocumento: formData.tipoDocumento || 'CC', // Ensure it's always set
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
      tipoSalario: formData.tipoSalario || 'mensual', // Add this required field
      tipoContrato: formData.tipoContrato || 'indefinido', // Ensure it's always set
      fechaIngreso: formData.fechaIngreso,
      periodicidadPago: formData.periodicidadPago,
      cargo: formData.cargo,
      codigoCIIU: formData.codigo_ciiu,
      nivelRiesgoARL: formData.nivelRiesgoARL || 'I',
      estado: formData.estado,
      centroCostos: formData.centroCostos,
      fechaFirmaContrato: formData.fechaFirmaContrato,
      fechaFinalizacionContrato: formData.fechaFinalizacionContrato,
      tipoJornada: formData.tipoJornada,
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
