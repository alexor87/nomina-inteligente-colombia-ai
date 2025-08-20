
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, CheckCircle2 } from 'lucide-react';

interface PayrollPoliciesSettingsProps {
  incapacityPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  onIncapacityPolicyChange: (value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => void;
}

export const PayrollPoliciesSettings = ({
  incapacityPolicy,
  onIncapacityPolicyChange
}: PayrollPoliciesSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚙️ Políticas de Cálculo de Nómina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Policy Status */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-900">Política Activa Actual</h4>
          </div>
          <div className="text-sm text-green-800">
            <strong>Incapacidades:</strong> {incapacityPolicy === 'standard_2d_100_rest_66' 
              ? 'Primeros 2 días al 100%, resto al 66.67% con piso SMLDV' 
              : 'Todos los días al 66.67% con piso SMLDV'}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Código: <code className="bg-green-100 px-1 rounded">{incapacityPolicy}</code>
          </div>
        </div>

        {/* Automatic IBC Explanation */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">🤖 Cálculo Automático de IBC</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Con incapacidades:</strong> IBC = Valor total de incapacidades del período</p>
            <p><strong>Sin incapacidades:</strong> IBC = (Salario Base ÷ 30) × Días Trabajados</p>
            <p className="text-xs text-blue-600 mt-2">
              El sistema determina automáticamente el método más apropiado según las circunstancias de cada empleado.
            </p>
          </div>
        </div>

        {/* Incapacity Policy Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">Política de Incapacidades</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Define cómo se calculan las incapacidades generales:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li><strong>Estándar:</strong> Primeros 2 días al 100%, resto al 66.67% con piso SMLDV</li>
                  <li><strong>Desde día 1:</strong> Todos los días al 66.67% con piso SMLDV</li>
                </ul>
                <p className="mt-2 text-xs">Las incapacidades laborales siempre se pagan al 100% desde el día 1.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <RadioGroup value={incapacityPolicy} onValueChange={onIncapacityPolicyChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard_2d_100_rest_66" id="policy-standard" />
              <Label htmlFor="policy-standard" className="cursor-pointer">
                <div>
                  <div className="font-medium">Estándar (2 días 100% + resto 66.67%)</div>
                  <div className="text-sm text-gray-600">
                    Primeros 2 días pagados por el empleador al 100%, resto por EPS al 66.67% con piso SMLDV
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    ✅ Cumple con Art. 227 CST - Mejora legal voluntaria para días 1-2
                  </div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="from_day1_66_with_floor" id="policy-from-day1" />
              <Label htmlFor="policy-from-day1" className="cursor-pointer">
                <div>
                  <div className="font-medium">Desde día 1 al 66.67% con piso SMLDV</div>
                  <div className="text-sm text-gray-600">
                    Todos los días al 66.67% del salario con piso de SMLDV (compatible con otro software)
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    ⚖️ Cumple estrictamente con Art. 227 CST - Pago mínimo legal
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Legal Framework */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-900 mb-2">⚖️ Marco Legal de Incapacidades</h4>
          <div className="text-sm text-yellow-800 space-y-2">
            <div>
              <strong>Incapacidad General (EPS):</strong>
              <ul className="list-disc list-inside ml-2 text-xs">
                <li>Mínimo legal: 66.67% del salario con piso de SMLDV (Art. 227 CST)</li>
                <li>Empleador puede mejorar condiciones (pagar días 1-2 al 100%)</li>
                <li>Días 3+ siempre a cargo de EPS al 66.67%</li>
              </ul>
            </div>
            <div>
              <strong>Incapacidad Laboral (ARL):</strong>
              <ul className="list-disc list-inside ml-2 text-xs">
                <li>Siempre 100% del salario desde el día 1</li>
                <li>A cargo de ARL (no aplica política de empresa)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview/Example with Current Policy */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">💡 Ejemplo con configuración actual:</h4>
          <div className="text-sm text-green-800 space-y-1">
            <p><strong>IBC:</strong> Se calcula automáticamente según las circunstancias del empleado</p>
            <p><strong>Incapacidad general (15 días, $1,400,000 salario):</strong></p>
            <div className="ml-4 text-xs bg-white/50 p-2 rounded">
              {incapacityPolicy === 'standard_2d_100_rest_66' ? (
                <>
                  <div>• Días 1-2: $93,333 × 2 = $186,667 (100%)</div>
                  <div>• Días 3-15: máx($62,222, $47,450) × 13 = $808,888 (66.67% con piso SMLDV)</div>
                  <div className="font-medium border-t pt-1 mt-1">Total: $995,555</div>
                </>
              ) : (
                <>
                  <div>• Días 1-15: máx($62,222, $47,450) × 15 = $933,333 (66.67% con piso SMLDV)</div>
                  <div className="font-medium border-t pt-1 mt-1">Total: $933,333</div>
                </>
              )}
            </div>
            <p><strong>Incapacidad laboral (15 días):</strong> $93,333 × 15 = $1,400,000 (100% automático)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
