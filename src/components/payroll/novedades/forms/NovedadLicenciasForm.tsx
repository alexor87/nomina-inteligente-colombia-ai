
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, Info, AlertTriangle, Scale } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface NovedadLicenciasFormProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  employeeSalary: number;
  calculateSuggestedValue?: (tipo: string, subtipo: string | undefined, dias?: number) => number | null;
  isSubmitting: boolean;
}

// ✅ NUEVA ESTRUCTURA: Diferenciación legal clara
const licenciaTypes = [
  { 
    value: 'remunerada', 
    label: 'Licencia Remunerada', 
    description: 'Se paga el 100% del salario durante la ausencia',
    legalBasis: 'Arts. 57, 230 CST',
    color: 'green',
    subtipos: [
      { value: 'paternidad', label: 'Paternidad', dias: 8, obligatoria: true },
      { value: 'matrimonio', label: 'Matrimonio', dias: 5, obligatoria: true },
      { value: 'luto', label: 'Luto', dias: 5, obligatoria: true },
      { value: 'estudio', label: 'Estudios', dias: null, obligatoria: false }
    ]
  },
  { 
    value: 'no_remunerada', 
    label: 'Licencia No Remunerada', 
    description: 'Permiso autorizado sin pago que mantiene el vínculo laboral',
    legalBasis: 'Art. 51 CST',
    color: 'yellow',
    subtipos: [
      { value: 'personal', label: 'Personal', dias: null, obligatoria: false },
      { value: 'estudios', label: 'Estudios', dias: null, obligatoria: false },
      { value: 'familiar', label: 'Emergencia Familiar', dias: null, obligatoria: false },
      { value: 'salud_no_eps', label: 'Salud (No EPS)', dias: null, obligatoria: false },
      { value: 'maternidad_extendida', label: 'Maternidad Extendida', dias: null, obligatoria: false },
      { value: 'cuidado_hijo_menor', label: 'Cuidado Hijo Menor', dias: null, obligatoria: false }
    ]
  }
];

export const NovedadLicenciasForm: React.FC<NovedadLicenciasFormProps> = ({
  onBack,
  onSubmit,
  employeeSalary,
  calculateSuggestedValue,
  isSubmitting
}) => {
  const [tipoLicencia, setTipoLicencia] = useState<string>('');
  const [subtipo, setSubtipo] = useState<string>('');
  const [dias, setDias] = useState<string>('');
  const [valorCalculado, setValorCalculado] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (tipoLicencia && dias && parseFloat(dias) > 0 && calculateSuggestedValue) {
      if (tipoLicencia === 'remunerada') {
        const calculatedValue = calculateSuggestedValue('licencia_remunerada', subtipo, parseFloat(dias));
        if (calculatedValue) {
          setValorCalculado(calculatedValue);
        }
      } else {
        // Licencia no remunerada siempre es $0
        setValorCalculado(0);
      }
    }
  }, [tipoLicencia, subtipo, dias, calculateSuggestedValue]);

  const handleSubmit = () => {
    if (!tipoLicencia || !dias || parseFloat(dias) <= 0) return;

    // ✅ NUEVA LÓGICA: Mapeo correcto según diferenciación legal
    const novedadType = tipoLicencia === 'remunerada' ? 'licencia_remunerada' : 'licencia_no_remunerada';

    onSubmit({
      tipo_novedad: novedadType,
      subtipo: subtipo || tipoLicencia,
      dias: parseFloat(dias),
      valor: tipoLicencia === 'remunerada' ? Math.abs(valorCalculado) : 0, // No remunerada siempre $0
      observacion: `${observacion} (${tipoLicencia === 'remunerada' ? 'Licencia Remunerada' : 'Licencia No Remunerada'})`.trim()
    });
  };

  const selectedType = licenciaTypes.find(t => t.value === tipoLicencia);
  const selectedSubtipo = selectedType?.subtipos.find(s => s.value === subtipo);
  const isValid = tipoLicencia && dias && parseFloat(dias) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900">Licencias</h3>
        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
          Diferenciación Legal
        </Badge>
      </div>

      {/* Información Legal */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Marco Legal Colombiano</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Licencia Remunerada:</strong> Derecho del trabajador con pago del 100% del salario (Arts. 57, 230 CST)</p>
              <p><strong>Licencia No Remunerada:</strong> Permiso autorizado sin pago que suspende temporalmente prestaciones (Art. 51 CST)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h4 className="text-gray-800 font-medium">Información de la Licencia</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tipo" className="text-gray-700">Tipo de Licencia</Label>
            <Select value={tipoLicencia} onValueChange={setTipoLicencia}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {licenciaTypes.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          tipo.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        {tipo.label}
                      </div>
                      <div className="text-xs text-gray-500">{tipo.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dias" className="text-gray-700">Días</Label>
            <Input
              id="dias"
              type="number"
              placeholder="0"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              min="0"
              step="1"
            />
          </div>
        </div>

        {selectedType && (
          <>
            <div>
              <Label htmlFor="subtipo" className="text-gray-700">Subtipo</Label>
              <Select value={subtipo} onValueChange={setSubtipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el subtipo" />
                </SelectTrigger>
                <SelectContent>
                  {selectedType.subtipos.map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      <div className="flex items-center justify-between w-full">
                        <span className="capitalize">{sub.label}</span>
                        {sub.obligatoria && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">
                            Obligatoria
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información Legal Específica */}
            <div className={`p-3 rounded border ${
              selectedType.color === 'green' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className={`flex items-center gap-2 mb-1 ${
                selectedType.color === 'green' ? 'text-green-700' : 'text-yellow-700'
              }`}>
                <Info className="h-4 w-4" />
                <span className="font-medium">Marco Legal</span>
              </div>
              <div className={`text-sm ${
                selectedType.color === 'green' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <p><strong>Base Legal:</strong> {selectedType.legalBasis}</p>
                <p>{selectedType.description}</p>
                {selectedType.value === 'no_remunerada' && (
                  <p className="mt-1"><strong>Efecto:</strong> Suspende acumulación de prestaciones sociales durante el período</p>
                )}
              </div>
            </div>

            {/* Días sugeridos para licencias obligatorias */}
            {selectedSubtipo?.obligatoria && selectedSubtipo.dias && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Días Legales</span>
                </div>
                <p className="text-sm text-blue-600">
                  Esta licencia tiene derecho legal a <strong>{selectedSubtipo.dias} días</strong> según la normativa vigente.
                </p>
              </div>
            )}
          </>
        )}

        {/* Cálculo del Valor */}
        {tipoLicencia && dias && parseFloat(dias) > 0 && (
          <div className={`p-3 rounded border ${
            tipoLicencia === 'remunerada' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className={`flex items-center gap-2 ${
              tipoLicencia === 'remunerada' ? 'text-green-700' : 'text-yellow-700'
            }`}>
              <Calculator className="h-4 w-4" />
              <span className="font-medium">
                {tipoLicencia === 'remunerada' ? 'Valor a Pagar' : 'Sin Remuneración'}
              </span>
            </div>
            <Badge variant="secondary" className={`mt-1 ${
              tipoLicencia === 'remunerada' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {tipoLicencia === 'remunerada' 
                ? `+${formatCurrency(valorCalculado)}`
                : '$0 (Sin pago por definición legal)'
              }
            </Badge>
            {tipoLicencia === 'no_remunerada' && (
              <p className="text-xs text-yellow-600 mt-1">
                Las licencias no remuneradas no generan pago pero mantienen el vínculo laboral
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="observacion" className="text-gray-700">Observaciones (Opcional)</Label>
          <Textarea
            id="observacion"
            placeholder="Detalles adicionales sobre la licencia..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Licencia'}
        </Button>
      </div>
    </div>
  );
};
