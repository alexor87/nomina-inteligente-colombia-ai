
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, AlertTriangle, Save, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PayrollAdjustmentService } from '@/services/PayrollAdjustmentService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';

interface Employee {
  id: string;
  nombre: string;
  apellido: string;
  salario_base: number;
}

interface AdjustmentForm {
  selectedEmployees: string[];
  concept: string;
  amount: number;
  observations: string;
}

const adjustmentConcepts = [
  'Bonificación adicional',
  'Descuento por tardanzas',
  'Horas extra no registradas',
  'Auxilio de transporte adicional',
  'Corrección de deducciones',
  'Otros'
];

export const PayrollAdjustmentPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  const [form, setForm] = useState<AdjustmentForm>({
    selectedEmployees: [],
    concept: '',
    amount: 0,
    observations: ''
  });

  useEffect(() => {
    const validateAndLoad = async () => {
      if (!periodId) return;

      try {
        // Validar permisos
        const canAdjust = await PayrollAdjustmentService.validateAdjustmentPermissions(periodId);
        setHasPermission(canAdjust);

        if (!canAdjust) {
          toast({
            title: "Sin permisos",
            description: "Solo los administradores pueden registrar ajustes",
            variant: "destructive"
          });
          navigate(`/app/payroll-history/${periodId}`);
          return;
        }

        // Cargar empleados del período (mock data por ahora)
        const mockEmployees: Employee[] = [
          { id: '1', nombre: 'Juan Carlos', apellido: 'Pérez', salario_base: 2500000 },
          { id: '2', nombre: 'María Elena', apellido: 'González', salario_base: 3000000 }
        ];
        setEmployees(mockEmployees);

      } catch (error) {
        console.error('Error validando permisos:', error);
        toast({
          title: "Error",
          description: "No se pudo validar los permisos",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    validateAndLoad();
  }, [periodId, navigate, toast]);

  const handleEmployeeToggle = (employeeId: string) => {
    setForm(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!periodId || form.selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un empleado",
        variant: "destructive"
      });
      return;
    }

    if (!form.concept || form.amount === 0) {
      toast({
        title: "Error",
        description: "Debe completar todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      // Crear ajuste para cada empleado seleccionado
      const adjustmentPromises = form.selectedEmployees.map(employeeId =>
        PayrollAdjustmentService.createAdjustment({
          periodId,
          employeeId,
          concept: form.concept,
          amount: form.amount,
          observations: form.observations
        })
      );

      await Promise.all(adjustmentPromises);

      toast({
        title: "✅ Ajuste registrado exitosamente",
        description: `Se ha registrado el ajuste para ${form.selectedEmployees.length} empleado(s). El cálculo original permanece intacto.`,
        className: "border-green-200 bg-green-50"
      });

      navigate(`/app/payroll-history/${periodId}`);
      
    } catch (error) {
      console.error('Error creando ajuste:', error);
      toast({
        title: "❌ Error registrando ajuste",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/app/payroll-history/${periodId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sin permisos</h3>
        <p className="text-gray-600">Solo los administradores pueden registrar ajustes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al período
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registrar Ajuste</h1>
            <p className="text-gray-600">
              Crear ajuste sin modificar la liquidación original
            </p>
          </div>
        </div>
      </div>

      {/* Alerta informativa */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Importante</h3>
              <p className="text-amber-800 text-sm">
                Este ajuste no modifica la liquidación original. Se generará un comprobante 
                independiente con tipo "ajuste" que será trazable en el historial.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de empleados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seleccionar Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employees.map(employee => (
                <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={form.selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => handleEmployeeToggle(employee.id)}
                    />
                    <div>
                      <div className="font-medium">
                        {employee.nombre} {employee.apellido}
                      </div>
                      <div className="text-sm text-gray-500">
                        Salario base: {formatCurrency(employee.salario_base)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {form.selectedEmployees.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {form.selectedEmployees.length} empleado(s) seleccionado(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos del ajuste */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Datos del Ajuste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="concept">Concepto del ajuste *</Label>
              <Select value={form.concept} onValueChange={(value) => setForm(prev => ({ ...prev, concept: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar concepto" />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentConcepts.map(concept => (
                    <SelectItem key={concept} value={concept}>{concept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Valor del ajuste *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
              <p className="text-sm text-gray-500 mt-1">
                Use valores negativos para descuentos
              </p>
            </div>

            <div>
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={form.observations}
                onChange={(e) => setForm(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Descripción detallada del ajuste..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleBack}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || form.selectedEmployees.length === 0}>
            {saving ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Registrar ajuste
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PayrollAdjustmentPage;
