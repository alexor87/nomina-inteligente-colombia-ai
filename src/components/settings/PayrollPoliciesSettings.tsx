
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield } from 'lucide-react';
import { NovedadPolicyManager } from '@/components/settings/NovedadPolicyManager';
import { IncapacityPolicyTester } from '@/components/settings/IncapacityPolicyTester';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

interface PayrollPoliciesSettingsProps {
  incapacityPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  onIncapacityPolicyChange: (value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => void;
}

export const PayrollPoliciesSettings: React.FC<PayrollPoliciesSettingsProps> = ({
  incapacityPolicy,
  onIncapacityPolicyChange
}) => {
  const { companyId } = useCurrentCompany();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Políticas de Cálculo de Incapacidades
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
                  <div className="flex flex-col">
                    <span className="font-medium">Estándar (Ley 1562/2012)</span>
                    <span className="text-sm text-gray-500">
                      Primeros 2 días: 100% empleador, resto: 66.67% EPS
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="from_day1_66_with_floor">
                  <div className="flex flex-col">
                    <span className="font-medium">Modificado con Piso</span>
                    <span className="text-sm text-gray-500">
                      Desde día 1: 66.67% EPS con piso SMLDV
                    </span>
                  </div>
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
                  Las incapacidades ya procesadas mantendrán su valor original.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Explicación de las Políticas:</h4>
            <div className="grid gap-3">
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">Política Estándar (Ley 1562/2012)</h5>
                <p className="text-sm text-gray-600 mt-1">
                  Los primeros 2 días de incapacidad están a cargo del empleador (100% del salario).
                  A partir del día 3, la EPS paga el 66.67% del IBC.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">Política con Piso SMLDV</h5>
                <p className="text-sm text-gray-600 mt-1">
                  Desde el primer día, la EPS paga el 66.67% del IBC, pero garantizando
                  un mínimo equivalente al Salario Mínimo Legal Diario Vigente.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Management Component */}
      {companyId && (
        <NovedadPolicyManager
          incapacityPolicy={incapacityPolicy}
          onIncapacityPolicyChange={onIncapacityPolicyChange}
          companyId={companyId}
        />
      )}

      {/* Policy Testing Component */}
      <IncapacityPolicyTester currentPolicy={incapacityPolicy} />
    </div>
  );
};
