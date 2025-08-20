
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Settings } from 'lucide-react';

interface NovedadPolicyManagerProps {
  incapacityPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  onIncapacityPolicyChange: (value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => void;
}

export const NovedadPolicyManager: React.FC<NovedadPolicyManagerProps> = ({
  incapacityPolicy,
  onIncapacityPolicyChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Políticas de Novedades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="incapacity-policy">Política de Incapacidades</Label>
          <Select
            value={incapacityPolicy}
            onValueChange={onIncapacityPolicyChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard_2d_100_rest_66">
                Estándar: 2 días 100%, resto 66.67%
              </SelectItem>
              <SelectItem value="from_day1_66_with_floor">
                Desde día 1: 66.67% con piso SMLDV
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Importante:</p>
              <p>Los cambios en las políticas afectarán nuevos cálculos de novedades. Las novedades existentes mantendrán su valor original a menos que se recalculen manualmente.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
