
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield } from 'lucide-react';

interface PayrollPoliciesSettingsProps {
  incapacityPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  onIncapacityPolicyChange: (value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => void;
}

export const PayrollPoliciesSettings: React.FC<PayrollPoliciesSettingsProps> = ({
  incapacityPolicy,
  onIncapacityPolicyChange
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Políticas de Nómina de la Empresa
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
                  Estándar primeros dos días al 100% y el resto al 66.67%
                </SelectItem>
                <SelectItem value="from_day1_66_with_floor">
                  Al 66.67% desde el día 1
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Importante:</p>
                <p>
                  La política seleccionada afectará todos los nuevos cálculos de incapacidades.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
