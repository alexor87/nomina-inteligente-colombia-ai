import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  Plus,
  Calculator,
  AlertTriangle,
  Info,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface Employee {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_lastname: string;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  salario_base: number;
}

interface AdjustmentModalProProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  period: {
    id: string;
    periodo: string;
    fecha_inicio: string;
    fecha_fin: string;
    tipo_periodo: string;
    estado: string;
  };
  employees: Employee[];
  onSuccess: () => void;
}

interface ConceptDefinition {
  id: string;
  code: string;
  name: string;
  type: 'devengo' | 'deduccion';
  category: string;
  description?: string;
  maxAmount?: number;
  requiresJustification: boolean;
  affectsSocialBenefits: boolean;
  requiresApproval: boolean;
}

interface AdjustmentForm {
  employee_id: string;
  concept_id: string;
  concept_name: string;
  type: 'devengo' | 'deduccion';
  amount: number | '';
  observations: string;
  justification: string;
  attachment_url?: string;
}

interface FinancialImpact {
  originalNetPay: number;
  adjustmentAmount: number;
  newNetPay: number;
  socialBenefitsImpact: number;
  employerContributionsImpact: number;
  totalCostImpact: number;
}

// Catálogo de conceptos predefinidos
const CONCEPT_CATALOG: ConceptDefinition[] = [
  // DEVENGOS
  {
    id: 'dev_001',
    code: 'BON_ESP',
    name: 'Bonificación Especial',
    type: 'devengo',
    category: 'Bonificaciones',
    description: 'Bonificación extraordinaria por desempeño o logros específicos',
    maxAmount: 2000000,
    requiresJustification: true,
    affectsSocialBenefits: true,
    requiresApproval: true
  },
  {
    id: 'dev_002',
    code: 'HRS_EXT',
    name: 'Horas Extras Adicionales',
    type: 'devengo',
    category: 'Tiempo Extra',
    description: 'Horas extras no contempladas en la liquidación original',
    maxAmount: 500000,
    requiresJustification: true,
    affectsSocialBenefits: true,
    requiresApproval: false
  },
  {
    id: 'dev_003',
    code: 'AUX_TRA',
    name: 'Auxilio de Transporte Adicional',
    type: 'devengo',
    category: 'Auxilios',
    description: 'Auxilio de transporte extraordinario',
    maxAmount: 200000,
    requiresJustification: false,
    affectsSocialBenefits: false,
    requiresApproval: false
  },
  {
    id: 'dev_004',
    code: 'COM_VEN',
    name: 'Comisiones por Ventas',
    type: 'devengo',
    category: 'Comisiones',
    description: 'Comisiones variables por cumplimiento de metas',
    maxAmount: 1000000,
    requiresJustification: true,
    affectsSocialBenefits: true,
    requiresApproval: false
  },
  {
    id: 'dev_005',
    code: 'REC_SAL',
    name: 'Reconocimiento Salarial',
    type: 'devengo',
    category: 'Reconocimientos',
    description: 'Ajuste por reconocimiento o corrección salarial',
    maxAmount: 1500000,
    requiresJustification: true,
    affectsSocialBenefits: true,
    requiresApproval: true
  },
  
  // DEDUCCIONES
  {
    id: 'ded_001',
    code: 'DES_MED',
    name: 'Descuento Médico',
    type: 'deduccion',
    category: 'Salud',
    description: 'Descuentos por servicios médicos o medicamentos',
    maxAmount: 300000,
    requiresJustification: true,
    affectsSocialBenefits: false,
    requiresApproval: false
  },
  {
    id: 'ded_002',
    code: 'DES_AUS',
    name: 'Descuento por Ausencias',
    type: 'deduccion',
    category: 'Tiempo',
    description: 'Descuento por ausencias no justificadas',
    maxAmount: 500000,
    requiresJustification: true,
    affectsSocialBenefits: true,
    requiresApproval: false
  },
  {
    id: 'ded_003',
    code: 'DES_DAN',
    name: 'Descuento por Daños',
    type: 'deduccion',
    category: 'Responsabilidades',
    description: 'Descuento por daños a equipos o instalaciones',
    maxAmount: 800000,
    requiresJustification: true,
    affectsSocialBenefits: false,
    requiresApproval: true
  },
  {
    id: 'ded_004',
    code: 'DES_PRE',
    name: 'Descuento de Préstamo',
    type: 'deduccion',
    category: 'Financiero',
    description: 'Cuota de préstamo o anticipo de sueldo',
    maxAmount: 1000000,
    requiresJustification: false,
    affectsSocialBenefits: false,
    requiresApproval: false
  },
  {
    id: 'ded_005',
    code: 'DES_JUD',
    name: 'Descuento Judicial',
    type: 'deduccion',
    category: 'Legal',
    description: 'Embargo o descuento por orden judicial',
    maxAmount: 999999999,
    requiresJustification: true,
    affectsSocialBenefits: false,
    requiresApproval: true
  }
];

export const AdjustmentModalPro: React.FC<AdjustmentModalProProps> = ({
  isOpen,
  onClose,
  periodId,
  period,
  employees,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [adjustments, setAdjustments] = useState<AdjustmentForm[]>([{
    employee_id: '',
    concept_id: '',
    concept_name: '',
    type: 'devengo',
    amount: '',
    observations: '',
    justification: ''
  }]);

  // Existing adjustments for validation
  const [existingAdjustments, setExistingAdjustments] = useState<any[]>([]);

  // Load existing adjustments for duplicate validation
  useEffect(() => {
    if (isOpen && periodId) {
      loadExistingAdjustments();
    }
  }, [isOpen, periodId]);

  const loadExistingAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_period_adjustments', { period_id: periodId });
      
      if (error) throw error;
      setExistingAdjustments(data || []);
    } catch (error) {
      console.error('Error loading existing adjustments:', error);
    }
  };

  // Get concepts by category
  const conceptsByCategory = useMemo(() => {
    const categories: Record<string, ConceptDefinition[]> = {};
    CONCEPT_CATALOG.forEach(concept => {
      if (!categories[concept.category]) {
        categories[concept.category] = [];
      }
      categories[concept.category].push(concept);
    });
    return categories;
  }, []);

  // Calculate financial impact
  const calculateImpact = (employeeId: string, amount: number, type: 'devengo' | 'deduccion'): FinancialImpact => {
    const employee = employees.find(e => e.employee_id === employeeId);
    if (!employee) {
      return {
        originalNetPay: 0,
        adjustmentAmount: amount,
        newNetPay: 0,
        socialBenefitsImpact: 0,
        employerContributionsImpact: 0,
        totalCostImpact: 0
      };
    }

    const adjustmentAmount = type === 'deduccion' ? -Math.abs(amount) : Math.abs(amount);
    const originalNetPay = employee.neto_pagado;
    const newNetPay = originalNetPay + adjustmentAmount;
    
    // Calcular impacto en prestaciones sociales (8.33% para cesantías, 8.33% para intereses, 8.33% para primas)
    const socialBenefitsRate = 0.25; // 25% aproximado
    const socialBenefitsImpact = type === 'devengo' ? amount * socialBenefitsRate : 0;
    
    // Calcular impacto en aportes patronales (20.5% aproximado)
    const employerContributionsRate = 0.205;
    const employerContributionsImpact = type === 'devengo' ? amount * employerContributionsRate : 0;
    
    const totalCostImpact = adjustmentAmount + socialBenefitsImpact + employerContributionsImpact;

    return {
      originalNetPay,
      adjustmentAmount,
      newNetPay,
      socialBenefitsImpact,
      employerContributionsImpact,
      totalCostImpact
    };
  };

  const handleAddAdjustment = () => {
    setAdjustments([...adjustments, {
      employee_id: '',
      concept_id: '',
      concept_name: '',
      type: 'devengo',
      amount: '',
      observations: '',
      justification: ''
    }]);
  };

  const handleRemoveAdjustment = (index: number) => {
    if (adjustments.length > 1) {
      setAdjustments(adjustments.filter((_, i) => i !== index));
    }
  };

  const handleAdjustmentChange = (index: number, field: keyof AdjustmentForm, value: any) => {
    const newAdjustments = [...adjustments];
    newAdjustments[index] = { ...newAdjustments[index], [field]: value };

    // If concept is changed, update related fields
    if (field === 'concept_id') {
      const concept = CONCEPT_CATALOG.find(c => c.id === value);
      if (concept) {
        newAdjustments[index].concept_name = concept.name;
        newAdjustments[index].type = concept.type;
      }
    }

    setAdjustments(newAdjustments);
  };

  const validateForm = () => {
    const errors: string[] = [];

    for (let i = 0; i < adjustments.length; i++) {
      const adjustment = adjustments[i];
      const concept = CONCEPT_CATALOG.find(c => c.id === adjustment.concept_id);

      // Required fields
      if (!adjustment.employee_id) {
        errors.push(`Ajuste ${i + 1}: Debe seleccionar un empleado`);
      }
      if (!adjustment.concept_id) {
        errors.push(`Ajuste ${i + 1}: Debe seleccionar un concepto`);
      }
      if (adjustment.amount === '' || adjustment.amount <= 0) {
        errors.push(`Ajuste ${i + 1}: El valor debe ser mayor a cero`);
      }

      if (concept && typeof adjustment.amount === 'number') {
        // Max amount validation
        if (concept.maxAmount && adjustment.amount > concept.maxAmount) {
          errors.push(`Ajuste ${i + 1}: El valor no puede exceder ${formatCurrency(concept.maxAmount)}`);
        }

        // Justification required
        if (concept.requiresJustification && !adjustment.justification.trim()) {
          errors.push(`Ajuste ${i + 1}: Este concepto requiere justificación`);
        }

        // Check for duplicates
        const duplicateExists = existingAdjustments.some(existing => 
          existing.employee_id === adjustment.employee_id && 
          existing.concept === concept.name
        );
        
        if (duplicateExists) {
          errors.push(`Ajuste ${i + 1}: Ya existe un ajuste con este concepto para el empleado seleccionado`);
        }
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Errores de validación",
        description: errors.join('. '),
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      for (const adjustment of adjustments) {
        const concept = CONCEPT_CATALOG.find(c => c.id === adjustment.concept_id);
        const finalAmount = adjustment.type === 'deduccion' ? -Math.abs(Number(adjustment.amount)) : Number(adjustment.amount);

        const { error } = await supabase.rpc('create_payroll_adjustment', {
          p_period_id: periodId,
          p_employee_id: adjustment.employee_id,
          p_concept: concept?.name || adjustment.concept_name,
          p_amount: finalAmount,
          p_observations: `${adjustment.observations} ${adjustment.justification}`.trim(),
          p_created_by: (await supabase.auth.getUser()).data.user?.id
        });

        if (error) throw error;
      }

      onSuccess();
      handleClose();
      
    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ajuste. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustments([{
      employee_id: '',
      concept_id: '',
      concept_name: '',
      type: 'devengo',
      amount: '',
      observations: '',
      justification: ''
    }]);
    setShowPreview(false);
    onClose();
  };

  const getEmployeeData = (employeeId: string) => {
    return employees.find(e => e.employee_id === employeeId);
  };

  const getSelectedConcept = (conceptId: string) => {
    return CONCEPT_CATALOG.find(c => c.id === conceptId);
  };

  // Calculate total impact
  const totalImpact = useMemo(() => {
    return adjustments.reduce((total, adjustment) => {
      if (adjustment.employee_id && typeof adjustment.amount === 'number') {
        const impact = calculateImpact(adjustment.employee_id, adjustment.amount, adjustment.type);
        return total + impact.totalCostImpact;
      }
      return total;
    }, 0);
  }, [adjustments, employees]);

  if (showPreview) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa - Ajustes de Nómina
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Period info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Período</Label>
                    <p className="text-lg font-semibold">{period.periodo}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fechas</Label>
                    <p>{new Date(period.fecha_inicio).toLocaleDateString()} - {new Date(period.fecha_fin).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adjustments summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Ajustes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adjustments.map((adjustment, index) => {
                    const employee = getEmployeeData(adjustment.employee_id);
                    const concept = getSelectedConcept(adjustment.concept_id);
                    const impact = typeof adjustment.amount === 'number' 
                      ? calculateImpact(adjustment.employee_id, adjustment.amount, adjustment.type)
                      : null;

                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Ajuste {index + 1}</h4>
                          <Badge variant={adjustment.type === 'devengo' ? 'default' : 'destructive'}>
                            {adjustment.type === 'devengo' ? 'Devengo' : 'Deducción'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label>Empleado</Label>
                            <p className="font-medium">
                              {employee ? `${employee.employee_name} ${employee.employee_lastname}` : '-'}
                            </p>
                          </div>
                          <div>
                            <Label>Concepto</Label>
                            <p className="font-medium">{concept?.name || '-'}</p>
                          </div>
                          <div>
                            <Label>Valor</Label>
                            <p className="font-mono font-semibold text-lg">
                              {typeof adjustment.amount === 'number' ? formatCurrency(adjustment.amount) : '-'}
                            </p>
                          </div>
                          <div>
                            <Label>Nuevo Neto</Label>
                            <p className="font-mono font-semibold">
                              {impact ? formatCurrency(impact.newNetPay) : '-'}
                            </p>
                          </div>
                        </div>

                        {concept?.requiresJustification && adjustment.justification && (
                          <div>
                            <Label>Justificación</Label>
                            <p className="text-sm text-muted-foreground">{adjustment.justification}</p>
                          </div>
                        )}

                        {concept?.requiresApproval && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Este ajuste requiere aprobación adicional debido al concepto seleccionado.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Financial impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Impacto Financiero Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm">Ajustes Netos</Label>
                    <p className="text-xl font-bold">{formatCurrency(totalImpact)}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm">Prestaciones</Label>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(adjustments.reduce((total, adj) => {
                        if (typeof adj.amount === 'number' && adj.type === 'devengo') {
                          return total + (adj.amount * 0.25);
                        }
                        return total;
                      }, 0))}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm">Aportes Patronales</Label>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(adjustments.reduce((total, adj) => {
                        if (typeof adj.amount === 'number' && adj.type === 'devengo') {
                          return total + (adj.amount * 0.205);
                        }
                        return total;
                      }, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Volver a editar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Registrando...' : 'Confirmar y registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registrar Ajuste de Nómina - {period.periodo}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {adjustments.map((adjustment, index) => {
              const selectedEmployee = getEmployeeData(adjustment.employee_id);
              const selectedConcept = getSelectedConcept(adjustment.concept_id);
              const impact = selectedEmployee && typeof adjustment.amount === 'number' 
                ? calculateImpact(adjustment.employee_id, adjustment.amount, adjustment.type)
                : null;

              return (
                <Card key={index}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Ajuste {index + 1}
                        {adjustment.type && (
                          <Badge variant={adjustment.type === 'devengo' ? 'default' : 'destructive'}>
                            {adjustment.type === 'devengo' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {adjustment.type === 'devengo' ? 'Devengo' : 'Deducción'}
                          </Badge>
                        )}
                      </CardTitle>
                      {adjustments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdjustment(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Employee selection */}
                    <div className="space-y-2">
                      <Label htmlFor={`employee-${index}`}>Empleado *</Label>
                      <Select 
                        value={adjustment.employee_id} 
                        onValueChange={(value) => handleAdjustmentChange(index, 'employee_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un empleado" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.employee_id} value={employee.employee_id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {employee.employee_name} {employee.employee_lastname}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Concept selection */}
                    <div className="space-y-2">
                      <Label htmlFor={`concept-${index}`}>Concepto *</Label>
                      <Select 
                        value={adjustment.concept_id} 
                        onValueChange={(value) => handleAdjustmentChange(index, 'concept_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un concepto" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(conceptsByCategory).map(([category, concepts]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                                {category}
                              </div>
                              {concepts.map((concept) => (
                                <SelectItem key={concept.id} value={concept.id}>
                                  <div className="flex items-center gap-2">
                                    {concept.type === 'devengo' ? (
                                      <TrendingUp className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 text-red-600" />
                                    )}
                                    <span>{concept.name}</span>
                                    {concept.requiresApproval && (
                                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedConcept && (
                        <div className="text-xs text-muted-foreground">
                          {selectedConcept.description}
                          {selectedConcept.maxAmount && (
                            <span className="block">Valor máximo: {formatCurrency(selectedConcept.maxAmount)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${index}`}>Valor *</Label>
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={adjustment.amount}
                        onChange={(e) => handleAdjustmentChange(index, 'amount', e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder="0.00"
                        className="font-mono text-lg"
                      />
                    </div>

                    {/* Justification (if required) */}
                    {selectedConcept?.requiresJustification && (
                      <div className="space-y-2">
                        <Label htmlFor={`justification-${index}`}>Justificación *</Label>
                        <Textarea
                          id={`justification-${index}`}
                          value={adjustment.justification}
                          onChange={(e) => handleAdjustmentChange(index, 'justification', e.target.value)}
                          placeholder="Explica el motivo del ajuste..."
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Observations */}
                    <div className="space-y-2">
                      <Label htmlFor={`observations-${index}`}>Observaciones</Label>
                      <Textarea
                        id={`observations-${index}`}
                        value={adjustment.observations}
                        onChange={(e) => handleAdjustmentChange(index, 'observations', e.target.value)}
                        placeholder="Información adicional..."
                        rows={2}
                      />
                    </div>

                    {/* Warnings */}
                    {selectedConcept?.requiresApproval && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Este concepto requiere aprobación adicional. Se notificará al supervisor correspondiente.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Impact preview */}
                    {impact && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4" />
                          <span className="font-medium text-sm">Impacto Financiero</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Neto original: <span className="font-mono">{formatCurrency(impact.originalNetPay)}</span></div>
                          <div>Nuevo neto: <span className="font-mono font-semibold">{formatCurrency(impact.newNetPay)}</span></div>
                          <div>Prestaciones: <span className="font-mono">{formatCurrency(impact.socialBenefitsImpact)}</span></div>
                          <div>Aportes: <span className="font-mono">{formatCurrency(impact.employerContributionsImpact)}</span></div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleAddAdjustment}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar otro ajuste
              </Button>
            </div>
          </div>

          {/* Context panel */}
          <div className="space-y-4">
            {/* Period info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Información del Período
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Label>Estado</Label>
                  <Badge variant={period.estado === 'cerrado' ? 'destructive' : 'default'}>
                    {period.estado}
                  </Badge>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <p className="capitalize">{period.tipo_periodo}</p>
                </div>
                <div>
                  <Label>Fechas</Label>
                  <p>{new Date(period.fecha_inicio).toLocaleDateString()} - {new Date(period.fecha_fin).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Selected employee info */}
            {adjustments.length === 1 && adjustments[0].employee_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Datos del Empleado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(() => {
                    const employee = getEmployeeData(adjustments[0].employee_id);
                    return employee ? (
                      <>
                        <div>
                          <Label>Nombre</Label>
                          <p className="font-medium">{employee.employee_name} {employee.employee_lastname}</p>
                        </div>
                        <Separator />
                        <div>
                          <Label>Salario Base</Label>
                          <p className="font-mono">{formatCurrency(employee.salario_base)}</p>
                        </div>
                        <div>
                          <Label>Total Devengado</Label>
                          <p className="font-mono">{formatCurrency(employee.total_devengado)}</p>
                        </div>
                        <div>
                          <Label>Deducciones</Label>
                          <p className="font-mono">{formatCurrency(employee.total_deducciones)}</p>
                        </div>
                        <div>
                          <Label>Neto Pagado</Label>
                          <p className="font-mono font-semibold text-lg">{formatCurrency(employee.neto_pagado)}</p>
                        </div>
                      </>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Total impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Impacto Total
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(totalImpact)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Incluye prestaciones y aportes
                </p>
              </CardContent>
            </Card>

            {/* Quick guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Guía Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-3 w-3 text-green-600 mt-0.5" />
                  <span><strong>Devengos:</strong> Aumentan el pago del empleado</span>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown className="h-3 w-3 text-red-600 mt-0.5" />
                  <span><strong>Deducciones:</strong> Reducen el pago del empleado</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5" />
                  <span><strong>Aprobación:</strong> Algunos conceptos requieren aprobación adicional</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)} 
            disabled={!validateForm()}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Vista previa
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !validateForm()}>
            {loading ? 'Guardando...' : 'Registrar ajustes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
