
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface PayrollPoliciesSettingsProps {
  ibcMode: 'proportional' | 'incapacity';
  incapacityPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  onIbcModeChange: (value: 'proportional' | 'incapacity') => void;
  onIncapacityPolicyChange: (value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => void;
}

export const PayrollPoliciesSettings = ({
  ibcMode,
  incapacityPolicy,
  onIbcModeChange,
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
        {/* IBC Mode Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">Modo de Cálculo de IBC</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Define cómo se calcula el Ingreso Base de Cotización para salud y pensión:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li><strong>Proporcional:</strong> IBC basado en días trabajados y salario base</li>
                  <li><strong>Incapacidad:</strong> IBC basado en el valor total de incapacidades del período</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <RadioGroup value={ibcMode} onValueChange={onIbcModeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="proportional" id="ibc-proportional" />
              <Label htmlFor="ibc-proportional" className="cursor-pointer">
                <div>
                  <div className="font-medium">Proporcional</div>
                  <div className="text-sm text-gray-600">
                    IBC = (Salario Base ÷ 30) × Días Trabajados
                  </div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="incapacity" id="ibc-incapacity" />
              <Label htmlFor="ibc-incapacity" className="cursor-pointer">
                <div>
                  <div className="font-medium">Basado en Incapacidades</div>
                  <div className="text-sm text-gray-600">
                    IBC = Valor total de incapacidades del período
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
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
                <p>Define cómo se calculan las incapacidades:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li><strong>Estándar:</strong> Primeros 2 días al 100%, resto al 66.67%</li>
                  <li><strong>Desde día 1:</strong> Todos los días al 66.67% con piso SMLDV</li>
                </ul>
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
                    Primeros 2 días pagados por el empleador al 100%, resto por EPS al 66.67%
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
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Preview/Example */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Ejemplo con configuración actual:</h4>
          <div className="text-sm text-blue-800">
            {ibcMode === 'proportional' ? (
              <div>
                <p><strong>IBC:</strong> Calculado proporcionalmente según días trabajados</p>
                <p><strong>Incapacidad:</strong> {incapacityPolicy === 'standard_2d_100_rest_66' 
                  ? 'Primeros 2 días 100%, resto 66.67%' 
                  : 'Todos los días 66.67% con piso SMLDV'}</p>
              </div>
            ) : (
              <div>
                <p><strong>IBC:</strong> Basado en valor total de incapacidades</p>
                <p><strong>Incapacidad:</strong> {incapacityPolicy === 'standard_2d_100_rest_66' 
                  ? 'Primeros 2 días 100%, resto 66.67%' 
                  : 'Todos los días 66.67% con piso SMLDV'}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
