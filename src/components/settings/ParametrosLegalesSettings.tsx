import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ParametrosLegalesSettings = () => {
  const { toast } = useToast();
  const [year, setYear] = useState('2025');
  const [salarioMinimo, setSalarioMinimo] = useState('');
  const [auxilioTransporte, setAuxilioTransporte] = useState('');
  const [uvt, setUvt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ibcMode, setIbcMode] = useState<'proportional' | 'incapacity'>('proportional');
  const [incapacityPolicy, setIncapacityPolicy] = useState<'standard_2d_100_rest_66' | 'from_day1_66_with_floor'>('standard_2d_100_rest_66');

  useEffect(() => {
    // Aquí podrías cargar los valores iniciales desde una API o configuración
    setSalarioMinimo('1300000');
    setAuxilioTransporte('162000');
    setUvt('47065');
  }, []);

  const handleSave = () => {
    toast({
      title: "No implementado",
      description: "Esta funcionalidad aún no está implementada.",
    });
  };

  const handleSavePolicies = () => {
    toast({
      title: "No implementado",
      description: "Esta funcionalidad aún no está implementada.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuración de Años */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Años</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Año</Label>
              <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSave}>Guardar Año</Button>
        </CardContent>
      </Card>

      {/* Parámetros Legales */}
      <Card>
        <CardHeader>
          <CardTitle>Parámetros Legales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="salarioMinimo">Salario Mínimo</Label>
              <Input
                id="salarioMinimo"
                value={salarioMinimo}
                onChange={(e) => setSalarioMinimo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auxilioTransporte">Auxilio de Transporte</Label>
              <Input
                id="auxilioTransporte"
                value={auxilioTransporte}
                onChange={(e) => setAuxilioTransporte(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uvt">UVT</Label>
              <Input id="uvt" value={uvt} onChange={(e) => setUvt(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSave}>Guardar Parámetros</Button>
        </CardContent>
      </Card>

      {/* ✅ POLÍTICAS DE CÁLCULO DE NÓMINA - ACTUALIZADO */}
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
            
            <RadioGroup value={ibcMode} onValueChange={(value: 'proportional' | 'incapacity') => setIbcMode(value)}>
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

          {/* ✅ ACTUALIZADO: Incapacity Policy Configuration con detalles de SMLDV */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">Política de Incapacidades</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Define cómo se calculan las incapacidades según normativa colombiana:</p>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    <li><strong>Estándar:</strong> Días 1-2 al 100% (empleador), días 3+ al 66.67% con piso SMLDV (EPS)</li>
                    <li><strong>Desde día 1:</strong> Todos los días al 66.67% con piso SMLDV (EPS)</li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-600">
                    💡 <strong>SMLDV:</strong> Salario Mínimo Legal Diario Vigente ($43,333 para 2025)
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <RadioGroup value={incapacityPolicy} onValueChange={(value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => setIncapacityPolicy(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard_2d_100_rest_66" id="policy-standard" />
                <Label htmlFor="policy-standard" className="cursor-pointer">
                  <div>
                    <div className="font-medium">Estándar (Normativa Colombia)</div>
                    <div className="text-sm text-gray-600">
                      Días 1-2: 100% empleador | Días 3+: 66.67% EPS con piso SMLDV
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      ✅ Garantiza piso mínimo de $43,333/día desde día 3
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="from_day1_66_with_floor" id="policy-from-day1" />
                <Label htmlFor="policy-from-day1" className="cursor-pointer">
                  <div>
                    <div className="font-medium">Desde día 1 con piso SMLDV</div>
                    <div className="text-sm text-gray-600">
                      Todos los días: 66.67% EPS con piso SMLDV
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      ✅ Compatible con otros software, piso mínimo $43,333/día
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* ✅ ACTUALIZADO: Preview/Example con SMLDV */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Ejemplo con configuración actual:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              {ibcMode === 'proportional' ? (
                <div>
                  <p><strong>IBC:</strong> Calculado proporcionalmente según días trabajados</p>
                  <p><strong>Incapacidad:</strong> {incapacityPolicy === 'standard_2d_100_rest_66' 
                    ? 'Días 1-2: 100% empleador, días 3+: 66.67% EPS (mín. $43,333/día)' 
                    : 'Todos los días: 66.67% EPS (mín. $43,333/día)'}</p>
                </div>
              ) : (
                <div>
                  <p><strong>IBC:</strong> Basado en valor total de incapacidades</p>
                  <p><strong>Incapacidad:</strong> {incapacityPolicy === 'standard_2d_100_rest_66' 
                    ? 'Días 1-2: 100% empleador, días 3+: 66.67% EPS (mín. $43,333/día)' 
                    : 'Todos los días: 66.67% EPS (mín. $43,333/día)'}</p>
                </div>
              )}
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                <strong>💡 Piso SMLDV:</strong> Garantiza que ninguna incapacidad se pague por debajo del salario mínimo diario ($43,333 para 2025)
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSavePolicies} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Políticas'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
