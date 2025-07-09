
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadForm } from './forms/NovedadForm';
import { CreateNovedadData, NovedadType, PayrollNovedad } from '@/types/novedades-enhanced';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { supabase } from '@/integrations/supabase/client';

interface NovedadDrawerProps {
  periodId: string;
  employee: {
    id: string;
    nombre: string;
    apellido: string;
    salarioBase: number;
  };
  trigger?: React.ReactNode;
  onNovedadesChange?: (novedades: PayrollNovedad[]) => void;
}

export const NovedadDrawer: React.FC<NovedadDrawerProps> = ({
  periodId,
  employee,
  trigger,
  onNovedadesChange
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [novedades, setNovedades] = useState<PayrollNovedad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<PayrollNovedad | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');

  // Load company ID
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
        }
      } catch (error) {
        console.error('Error loading company ID:', error);
      }
    };

    loadCompanyId();
  }, []);

  // Load existing novedades
  useEffect(() => {
    if (isOpen && employee.id && periodId) {
      loadNovedades();
    }
  }, [isOpen, employee.id, periodId]);

  const loadNovedades = async () => {
    try {
      const result = await NovedadesEnhancedService.getNovedadesByEmployee(employee.id, periodId);
      if (result.success && result.data) {
        setNovedades(result.data);
        onNovedadesChange?.(result.data);
      }
    } catch (error) {
      console.error('Error loading novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las novedades",
        variant: "destructive"
      });
    }
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "No se pudo obtener el ID de la empresa",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const createData = {
        ...data,
        company_id: companyId,
        empleado_id: employee.id,
        periodo_id: periodId,
        valor: data.valor || 0
      };

      const result = await NovedadesEnhancedService.createNovedad(createData);
      if (result.success) {
        toast({
          title: "✅ Novedad creada",
          description: "La novedad se ha creado correctamente",
          className: "border-green-200 bg-green-50"
        });
        await loadNovedades();
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error creating novedad:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo crear la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNovedad = async (data: CreateNovedadData) => {
    if (!editingNovedad) return;

    setIsLoading(true);
    try {
      const result = await NovedadesEnhancedService.updateNovedad(editingNovedad.id, {
        ...data,
        valor: data.valor || 0
      });
      if (result.success) {
        toast({
          title: "✅ Novedad actualizada",
          description: "La novedad se ha actualizado correctamente",
          className: "border-green-200 bg-green-50"
        });
        await loadNovedades();
        setEditingNovedad(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error updating novedad:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNovedad = async (novedadId: string) => {
    setIsLoading(true);
    try {
      await NovedadesEnhancedService.deleteNovedad(novedadId);
      toast({
        title: "✅ Novedad eliminada",
        description: "La novedad se ha eliminado correctamente",
        className: "border-green-200 bg-green-50"
      });
      await loadNovedades();
    } catch (error) {
      console.error('Error deleting novedad:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar la novedad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getNovedadTypeLabel = (tipo: NovedadType): string => {
    const labels: Record<NovedadType, string> = {
      horas_extra: 'Horas Extra',
      recargo_nocturno: 'Recargo Nocturno',
      vacaciones: 'Vacaciones',
      licencia_remunerada: 'Licencia Remunerada',
      licencia_no_remunerada: 'Licencia No Remunerada',
      incapacidad: 'Incapacidad',
      bonificacion: 'Bonificación',
      comision: 'Comisión',
      prima: 'Prima',
      otros_ingresos: 'Otros Ingresos',
      salud: 'Descuento Salud',
      pension: 'Descuento Pensión',
      arl: 'Descuento ARL',
      retencion_fuente: 'Retención en la Fuente',
      fondo_solidaridad: 'Fondo de Solidaridad',
      ausencia: 'Ausencia'
    };
    return labels[tipo] || tipo;
  };

  const getNovedadColor = (tipo: NovedadType): string => {
    const ingresos: NovedadType[] = ['horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos'];
    const deducciones: NovedadType[] = ['salud', 'pension', 'arl', 'retencion_fuente', 'fondo_solidaridad'];
    const tiempos: NovedadType[] = ['vacaciones', 'incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'ausencia'];
    
    if (ingresos.includes(tipo)) return 'bg-green-100 text-green-800';
    if (deducciones.includes(tipo)) return 'bg-red-100 text-red-800';
    if (tiempos.includes(tipo)) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const calculateTotals = () => {
    const ingresos = novedades.filter(n => 
      ['horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(n.tipo_novedad)
    ).reduce((sum, n) => sum + (n.valor || 0), 0);
    
    const deducciones = novedades.filter(n => 
      ['salud', 'pension', 'arl', 'retencion_fuente', 'fondo_solidaridad'].includes(n.tipo_novedad)
    ).reduce((sum, n) => sum + (n.valor || 0), 0);
    
    return { ingresos, deducciones };
  };

  const { ingresos, deducciones } = calculateTotals();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calculator className="w-4 h-4 mr-2" />
            Novedades
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Novedades - {employee.nombre} {employee.apellido}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Total Ingresos</div>
                <div className="text-2xl font-bold text-green-600">
                  ${ingresos.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Total Deducciones</div>
                <div className="text-2xl font-bold text-red-600">
                  ${deducciones.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Novedad Button */}
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Novedad
            </Button>
          )}

          {/* Form */}
          {showForm && (
            <NovedadForm
              initialData={editingNovedad || undefined}
              employeeSalary={employee.salarioBase}
              onSubmit={editingNovedad ? handleUpdateNovedad : handleCreateNovedad}
              onCancel={() => {
                setShowForm(false);
                setEditingNovedad(null);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Novedades List */}
          <div className="space-y-3">
            {novedades.map((novedad) => (
              <Card key={novedad.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getNovedadColor(novedad.tipo_novedad)}>
                          {getNovedadTypeLabel(novedad.tipo_novedad)}
                        </Badge>
                        <span className="font-semibold">
                          ${(novedad.valor || 0).toLocaleString()}
                        </span>
                      </div>
                      {novedad.observacion && (
                        <p className="text-sm text-gray-600">{novedad.observacion}</p>
                      )}
                      {novedad.dias && (
                        <p className="text-xs text-gray-500">Días: {novedad.dias}</p>
                      )}
                      {novedad.horas && (
                        <p className="text-xs text-gray-500">Horas: {novedad.horas}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingNovedad(novedad);
                          setShowForm(true);
                        }}
                        disabled={isLoading}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNovedad(novedad.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {novedades.length === 0 && !showForm && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calculator className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No hay novedades registradas</p>
                <p className="text-sm text-gray-400 mt-1">
                  Haz clic en "Agregar Novedad" para empezar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
