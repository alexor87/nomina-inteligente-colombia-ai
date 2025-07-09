
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadesEnhancedService } from '@/services/NovedadesEnhancedService';
import { NovedadType, CreateNovedadData, PayrollNovedad } from '@/types/novedades-enhanced';
import { supabase } from '@/integrations/supabase/client';

interface DevengoModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  employee: {
    id: string;
    nombre: string;
    apellido: string;
    salarioBase: number;
  };
  initialNovedades?: PayrollNovedad[];
  onSave?: (novedades: PayrollNovedad[]) => void;
}

interface NovedadDisplay {
  id?: string;
  tipo_novedad: NovedadType;
  valor: number;
  observacion: string;
  isNew?: boolean;
}

export const DevengoModal: React.FC<DevengoModalProps> = ({
  isOpen,
  onClose,
  periodId,
  employee,
  initialNovedades = [],
  onSave
}) => {
  const { toast } = useToast();
  const [novedades, setNovedades] = useState<NovedadDisplay[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (isOpen) {
      loadCompanyId();
    }
  }, [isOpen]);

  // Load existing novedades
  useEffect(() => {
    if (isOpen && initialNovedades.length > 0) {
      const mappedNovedades: NovedadDisplay[] = initialNovedades.map(novedad => ({
        id: novedad.id,
        tipo_novedad: novedad.tipo_novedad,
        valor: novedad.valor || 0,
        observacion: novedad.observacion || '',
        isNew: false
      }));
      setNovedades(mappedNovedades);
    } else if (isOpen) {
      setNovedades([]);
    }
  }, [isOpen, initialNovedades]);

  const addNovedad = () => {
    const newNovedad: NovedadDisplay = {
      tipo_novedad: 'bonificacion',
      valor: 0,
      observacion: '',
      isNew: true
    };
    setNovedades([...novedades, newNovedad]);
  };

  const removeNovedad = (index: number) => {
    setNovedades(novedades.filter((_, i) => i !== index));
  };

  const updateNovedad = (index: number, field: keyof NovedadDisplay, value: any) => {
    const updated = [...novedades];
    updated[index] = { ...updated[index], [field]: value };
    setNovedades(updated);
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "No se pudo obtener el ID de la empresa",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const savedNovedades: PayrollNovedad[] = [];

      for (const novedad of novedades) {
        if (novedad.isNew) {
          // Create new novedad
          const createData: CreateNovedadData = {
            company_id: companyId,
            empleado_id: employee.id,
            periodo_id: periodId,
            tipo_novedad: novedad.tipo_novedad,
            valor: novedad.valor || 0,
            observacion: novedad.observacion
          };

          const result = await NovedadesEnhancedService.createNovedad(createData);
          if (result.success && result.data) {
            savedNovedades.push(result.data);
          }
        } else if (novedad.id) {
          // Update existing novedad
          const updateData = {
            tipo_novedad: novedad.tipo_novedad,
            valor: novedad.valor || 0,
            observacion: novedad.observacion
          };

          const result = await NovedadesEnhancedService.updateNovedad(novedad.id, updateData);
          if (result.success && result.data) {
            savedNovedades.push(result.data);
          }
        }
      }

      toast({
        title: "✅ Novedades guardadas",
        description: `Se guardaron ${savedNovedades.length} novedades correctamente`,
        className: "border-green-200 bg-green-50"
      });

      onSave?.(savedNovedades);
      onClose();
    } catch (error) {
      console.error('Error saving novedades:', error);
      toast({
        title: "❌ Error",
        description: "No se pudieron guardar las novedades",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNovedadLabel = (tipo: NovedadType): string => {
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

  const totalDevengos = novedades.reduce((sum, novedad) => {
    const tiposDevengos: NovedadType[] = [
      'horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos'
    ];
    return tiposDevengos.includes(novedad.tipo_novedad) ? sum + novedad.valor : sum;
  }, 0);

  const totalDeducciones = novedades.reduce((sum, novedad) => {
    const tiposDeducciones: NovedadType[] = [
      'salud', 'pension', 'arl', 'retencion_fuente'
    ];
    return tiposDeducciones.includes(novedad.tipo_novedad) ? sum + novedad.valor : sum;
  }, 0);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Devengos y Deducciones - {employee.nombre} {employee.apellido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" onClick={addNovedad} className="mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Novedad
          </Button>

          {novedades.map((novedad, index) => (
            <Card key={novedad.id || index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <Label>Tipo de Novedad</Label>
                    <Select
                      value={novedad.tipo_novedad}
                      onValueChange={(value: NovedadType) => updateNovedad(index, 'tipo_novedad', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          'horas_extra',
                          'recargo_nocturno',
                          'vacaciones',
                          'licencia_remunerada',
                          'licencia_no_remunerada',
                          'incapacidad',
                          'bonificacion',
                          'comision',
                          'prima',
                          'otros_ingresos',
                          'salud',
                          'pension',
                          'arl',
                          'retencion_fuente',
                          'fondo_solidaridad',
                          'ausencia'
                        ].map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {getNovedadLabel(tipo as NovedadType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={novedad.valor}
                      onChange={(e) => updateNovedad(index, 'valor', Number(e.target.value))}
                      min={0}
                    />
                  </div>

                  <div className="col-span-5">
                    <Label>Observación</Label>
                    <Textarea
                      value={novedad.observacion}
                      onChange={(e) => updateNovedad(index, 'observacion', e.target.value)}
                      rows={1}
                    />
                  </div>

                  <div className="col-span-2 flex items-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeNovedad(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Total Devengos</div>
                <div className="text-2xl font-bold text-green-600">${totalDevengos.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Total Deducciones</div>
                <div className="text-2xl font-bold text-red-600">${totalDeducciones.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Novedades'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
