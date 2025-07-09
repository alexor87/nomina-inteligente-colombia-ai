
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NovedadForm } from '@/components/payroll/novedades/NovedadForm';
import { CreateNovedadData, NovedadType } from '@/types/novedades-enhanced';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: {
    id: string;
    nombre: string;
    apellido: string;
    salarioBase: number;
  };
  periodId?: string;
  onSuccess?: () => void;
}

export const DevengoModal: React.FC<DevengoModalProps> = ({
  isOpen,
  onClose,
  employee,
  periodId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [formData, setFormData] = useState<CreateNovedadData>({
    company_id: '',
    empleado_id: employee?.id || '',
    periodo_id: periodId || '',
    tipo_novedad: 'bonificacion',
    valor: 0
  });

  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          setFormData(prev => ({ ...prev, company_id: profile.company_id }));
        }
      } catch (error) {
        console.error('Error loading company ID:', error);
      }
    };

    if (isOpen) {
      loadCompanyId();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employee && periodId) {
      setFormData(prev => ({
        ...prev,
        empleado_id: employee.id,
        periodo_id: periodId,
        company_id: companyId
      }));
    }
  }, [employee, periodId, companyId]);

  const handleSubmit = async () => {
    if (!employee || !periodId || !companyId) {
      toast({
        title: "Error",
        description: "Faltan datos requeridos",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ FIXED: Handle service response properly
      const result = await NovedadesEnhancedService.createNovedad(formData);
      
      if (result) { // ✅ SIMPLIFIED: Just check if result exists
        toast({
          title: "✅ Devengo creado",
          description: "El devengo se ha creado correctamente",
          className: "border-green-200 bg-green-50"
        });
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating devengo:', error);
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo crear el devengo",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    // Similar fix for update
    setIsSubmitting(true);
    try {
      const result = await NovedadesEnhancedService.updateNovedad(formData.empleado_id, formData);
      
      if (result) { // ✅ SIMPLIFIED
        toast({
          title: "✅ Devengo actualizado",
          description: "El devengo se ha actualizado correctamente",
          className: "border-green-200 bg-green-50"
        });
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating devengo:', error);
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo actualizar el devengo",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Agregar Devengo - {employee?.nombre} {employee?.apellido}
          </DialogTitle>
        </DialogHeader>

        <NovedadForm
          formData={formData}
          onFormDataChange={setFormData}
          employeeSalary={employee?.salarioBase || 0}
          modalType="devengado"
        />

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Devengo'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
