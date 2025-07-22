
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ArrowLeft, 
  Plus, 
  AlertTriangle,
  User,
  DollarSign,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { HistoryServiceAleluya, PeriodDetail } from '@/services/HistoryServiceAleluya';
import { useToast } from '@/hooks/use-toast';

/**
 * ✅ PÁGINA DE REGISTRO DE AJUSTES
 * Permite crear ajustes sobre períodos liquidados
 */
export const PayrollAdjustmentPage = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [periodDetail, setPeriodDetail] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    concept: '',
    amount: '',
    observations: ''
  });

  useEffect(() => {
    if (periodId) {
      loadPeriodDetail();
    }
  }, [periodId]);

  const loadPeriodDetail = async () => {
    try {
      setLoading(true);
      const detail = await HistoryServiceAleluya.getPeriodDetail(periodId!);
      setPeriodDetail(detail);
    } catch (error) {
      console.error('Error loading period detail:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del período",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.employeeId) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar un empleado",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.concept.trim()) {
      toast({
        title: "Error de validación",
        description: "Debe especificar el concepto del ajuste",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.amount.trim() || isNaN(Number(formData.amount))) {
      toast({
        title: "Error de validación",
        description: "Debe especificar un valor numérico válido",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      
      await HistoryServiceAleluya.createAdjustment({
        periodId: periodId!,
        employeeId: formData.employeeId,
        concept: formData.concept.trim(),
        amount: Number(formData.amount),
        observations: formData.observations.trim()
      });
      
      toast({
        title: "Ajuste creado",
        description: "El ajuste ha sido registrado exitosamente",
      });
      
      navigate(`/app/payroll-history/${periodId}`);
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el ajuste",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedEmployee = () => {
    if (!periodDetail || !formData.employeeId) return null;
    return periodDetail.employees.find(emp => emp.id === formData.employeeId);
  };

  const hasExistingAdjustment = () => {
    if (!periodDetail || !formData.employeeId || !formData.concept.trim()) return false;
    
    return periodDetail.adjustments.some(adj => 
      adj.employeeId === formData.employeeId && 
      adj.concept.toLowerCase() === formData.concept.toLowerCase()
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!periodDetail) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Período no encontrado</h2>
          <Button onClick={() => navigate('/app/payroll-history')}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  const selectedEmployee = getSelectedEmployee();
  const hasExistingAdj = hasExistingAdjustment();

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/app/payroll-history/${periodId}`)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al detalle</span>
        </Button>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Plus className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registrar Ajuste</h1>
            <p className="text-gray-600">{periodDetail.period.period}</p>
          </div>
        </div>
      </div>

      {/* Información del período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Información del Período</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Fecha:</p>
              <p className="font-medium">
                {new Date(periodDetail.period.startDate).toLocaleDateString('es-ES')} - {' '}
                {new Date(periodDetail.period.endDate).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Empleados:</p>
              <p className="font-medium">{periodDetail.employees.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Total neto:</p>
              <p className="font-medium">{formatCurrency(periodDetail.summary.totalNeto)}</p>
            </div>
            <div>
              <p className="text-gray-600">Ajustes previos:</p>
              <p className="font-medium">{periodDetail.adjustments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Ajuste</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de empleado */}
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => handleInputChange('employeeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {periodDetail.employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{employee.name}</span>
                        <span className="text-gray-500">({employee.position})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información del empleado seleccionado */}
            {selectedEmployee && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{selectedEmployee.name}</p>
                    <p className="text-sm text-blue-700">
                      Neto pagado: {formatCurrency(selectedEmployee.netPay)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Concepto */}
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                type="text"
                value={formData.concept}
                onChange={(e) => handleInputChange('concept', e.target.value)}
                placeholder="Ej: Bonificación extra, Descuento por daño, etc."
                className="w-full"
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-600">
                Usar valores positivos para bonificaciones, negativos para descuentos
              </p>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleInputChange('observations', e.target.value)}
                placeholder="Detalles adicionales del ajuste (opcional)"
                rows={3}
              />
            </div>

            {/* Advertencia de duplicado */}
            {hasExistingAdj && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">
                  Ya existe un ajuste para este empleado con el mismo concepto
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/app/payroll-history/${periodId}`)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || hasExistingAdj}
                className="flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Crear Ajuste</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollAdjustmentPage;
