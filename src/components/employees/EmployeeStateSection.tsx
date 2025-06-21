
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EmployeeState, EMPLOYEE_STATUS_OPTIONS } from '@/types/employee-config';

interface EmployeeStateSectionProps {
  data: EmployeeState;
  onUpdate: (data: Partial<EmployeeState>) => void;
}

export const EmployeeStateSection = ({ data, onUpdate }: EmployeeStateSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">🧠 Estado del Empleado</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="status">Estado</Label>
          <Select value={data.status} onValueChange={(value) => onUpdate({ status: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeInPayroll"
            checked={data.includeInPayroll}
            onCheckedChange={(checked) => onUpdate({ includeInPayroll: !!checked })}
          />
          <Label htmlFor="includeInPayroll">¿Incluir en liquidación de nómina?</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowSelfManagement"
            checked={data.allowSelfManagement}
            onCheckedChange={(checked) => onUpdate({ allowSelfManagement: !!checked })}
          />
          <Label htmlFor="allowSelfManagement">¿Permitir autogestión en portal?</Label>
        </div>
      </div>
    </Card>
  );
};
