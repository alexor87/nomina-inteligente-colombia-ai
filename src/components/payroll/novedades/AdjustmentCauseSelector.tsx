import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import { ADJUSTMENT_CAUSE_CATEGORIES, getAdjustmentCauseById, type AdjustmentCause } from '@/types/adjustmentCauses';

interface AdjustmentCauseSelectorProps {
  onCauseChange: (cause: AdjustmentCause | null, observation: string) => void;
  initialObservation?: string;
}

export const AdjustmentCauseSelector: React.FC<AdjustmentCauseSelectorProps> = ({
  onCauseChange,
  initialObservation = ''
}) => {
  const [selectedCauseId, setSelectedCauseId] = useState<string>('');
  const [observation, setObservation] = useState<string>(initialObservation);
  const [selectedCause, setSelectedCause] = useState<AdjustmentCause | null>(null);

  // Parse initial observation if it contains a cause
  useEffect(() => {
    if (initialObservation.startsWith('CAUSAL:')) {
      const parts = initialObservation.split(' | OBSERVACIÓN: ');
      if (parts.length === 2) {
        const causalPart = parts[0].replace('CAUSAL: ', '');
        setObservation(parts[1]);
        
        // Try to find the cause by label
        const allCauses = ADJUSTMENT_CAUSE_CATEGORIES.flatMap(cat => cat.causes);
        const foundCause = allCauses.find(cause => cause.label === causalPart);
        if (foundCause) {
          setSelectedCauseId(foundCause.id);
          setSelectedCause(foundCause);
        }
      }
    } else {
      setObservation(initialObservation);
    }
  }, [initialObservation]);

  const handleCauseChange = (causeId: string) => {
    setSelectedCauseId(causeId);
    const cause = getAdjustmentCauseById(causeId);
    setSelectedCause(cause || null);
    
    // Auto-fill observation with template if available and observation is empty
    if (cause && cause.template && !observation.trim()) {
      setObservation(cause.template);
      onCauseChange(cause, cause.template);
    } else {
      onCauseChange(cause || null, observation);
    }
  };

  const handleObservationChange = (value: string) => {
    setObservation(value);
    onCauseChange(selectedCause, value);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-500" />
        <Label className="text-sm font-medium">Información del Ajuste</Label>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="adjustment-cause" className="text-sm">
            Causal del ajuste <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedCauseId} onValueChange={handleCauseChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona la causal del ajuste" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {ADJUSTMENT_CAUSE_CATEGORIES.map((category) => (
                <SelectGroup key={category.id}>
                  <SelectLabel className="font-medium text-xs text-muted-foreground px-2 py-1">
                    {category.label}
                  </SelectLabel>
                  {category.causes.map((cause) => (
                    <SelectItem key={cause.id} value={cause.id} className="pl-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{cause.label}</span>
                        {cause.description && (
                          <span className="text-xs text-muted-foreground">{cause.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="adjustment-observation" className="text-sm">
            Observación del ajuste <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="adjustment-observation"
            value={observation}
            onChange={(e) => handleObservationChange(e.target.value)}
            placeholder="Describe los detalles específicos del ajuste..."
            className="min-h-[80px] resize-none"
          />
          {selectedCause?.template && (
            <p className="text-xs text-muted-foreground mt-1">
              💡 Tip: Reemplaza los valores entre corchetes [valor] con información específica
            </p>
          )}
        </div>
      </div>
    </div>
  );
};