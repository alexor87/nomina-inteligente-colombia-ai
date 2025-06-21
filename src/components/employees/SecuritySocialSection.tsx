
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SecuritySocial, AFFILIATE_TYPES, ContractType } from '@/types/employee-config';

interface SecuritySocialSectionProps {
  data: SecuritySocial;
  contractType: ContractType;
  onUpdate: (data: Partial<SecuritySocial>) => void;
}

export const SecuritySocialSection = ({ data, contractType, onUpdate }: SecuritySocialSectionProps) => {
  const isServiceContract = contractType === 'prestacion';

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">🏥 Seguridad Social</h3>
      
      {isServiceContract && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Los contratos de prestación de servicios no requieren afiliaciones a EPS, AFP ni Caja de Compensación.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isServiceContract && (
          <>
            <div>
              <Label htmlFor="eps">EPS *</Label>
              <Input
                id="eps"
                value={data.eps}
                onChange={(e) => onUpdate({ eps: e.target.value })}
                placeholder="Nombre de la EPS"
              />
            </div>

            <div>
              <Label htmlFor="afp">AFP (Fondo de Pensiones) *</Label>
              <Input
                id="afp"
                value={data.afp}
                onChange={(e) => onUpdate({ afp: e.target.value })}
                placeholder="Nombre del fondo de pensiones"
              />
            </div>

            <div>
              <Label htmlFor="cajaCompensacion">Caja de Compensación *</Label>
              <Input
                id="cajaCompensacion"
                value={data.cajaCompensacion}
                onChange={(e) => onUpdate({ cajaCompensacion: e.target.value })}
                placeholder="Nombre de la caja de compensación"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="affiliateType">Tipo de Afiliado</Label>
          <Select value={data.affiliateType} onValueChange={(value) => onUpdate({ affiliateType: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AFFILIATE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="affiliationNumber">Número de Afiliación (Opcional)</Label>
          <Input
            id="affiliationNumber"
            value={data.affiliationNumber || ''}
            onChange={(e) => onUpdate({ affiliationNumber: e.target.value })}
            placeholder="Número de afiliación"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasBeneficiaries"
            checked={data.hasBeneficiaries}
            onCheckedChange={(checked) => onUpdate({ hasBeneficiaries: !!checked })}
          />
          <Label htmlFor="hasBeneficiaries">¿Tiene beneficiarios?</Label>
        </div>
      </div>
    </Card>
  );
};
