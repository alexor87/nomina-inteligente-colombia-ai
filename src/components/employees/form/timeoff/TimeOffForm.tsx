
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeOffService } from '@/services/TimeOffService';
import { TimeOffCalculator } from './TimeOffCalculator';

interface TimeOffFormData {
  type: string;
  start_date: string;
  end_date: string;
  observations: string;
}

interface TimeOffFormProps {
  formData: TimeOffFormData;
  onFormDataChange: (data: TimeOffFormData) => void;
  disabled?: boolean;
}

const timeOffTypes = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'licencia_remunerada', label: 'Licencia Remunerada' },
  { value: 'licencia_no_remunerada', label: 'Licencia No Remunerada' },
  { value: 'ausencia', label: 'Ausencia' },
  { value: 'incapacidad', label: 'Incapacidad' }
];

export const TimeOffForm = ({ formData, onFormDataChange, disabled = false }: TimeOffFormProps) => {
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);

  const handleInputChange = (field: keyof TimeOffFormData, value: string) => {
    const newData = { ...formData, [field]: value };
    onFormDataChange(newData);

    // Calcular días cuando ambas fechas están completas
    if (newData.start_date && newData.end_date) {
      const days = TimeOffService.calculateBusinessDays(newData.start_date, newData.end_date);
      setCalculatedDays(days);
    } else {
      setCalculatedDays(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="type">Tipo</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => handleInputChange('type', value)}
          disabled={disabled}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            {timeOffTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="start_date">Fecha de Inicio</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => handleInputChange('start_date', e.target.value)}
          className="mt-1"
          disabled={disabled}
        />
      </div>

      <div>
        <Label htmlFor="end_date">Fecha de Fin</Label>
        <Input
          id="end_date"
          type="date"
          value={formData.end_date}
          onChange={(e) => handleInputChange('end_date', e.target.value)}
          className="mt-1"
          disabled={disabled}
        />
      </div>

      <TimeOffCalculator 
        startDate={formData.start_date}
        endDate={formData.end_date}
        calculatedDays={calculatedDays}
      />

      <div>
        <Label htmlFor="observations">Observaciones (opcional)</Label>
        <Textarea
          id="observations"
          value={formData.observations}
          onChange={(e) => handleInputChange('observations', e.target.value)}
          placeholder="Ej: Vacaciones familiares, certificado médico..."
          className="mt-1"
          rows={3}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
