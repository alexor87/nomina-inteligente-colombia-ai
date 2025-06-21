
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonalData, DOCUMENT_TYPES, GENDER_OPTIONS, CIVIL_STATUS_OPTIONS } from '@/types/employee-config';

interface PersonalDataSectionProps {
  data: PersonalData;
  onUpdate: (data: Partial<PersonalData>) => void;
}

export const PersonalDataSection = ({ data, onUpdate }: PersonalDataSectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">📋 Datos Personales</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="documentType">Tipo de Documento *</Label>
          <Select value={data.documentType} onValueChange={(value) => onUpdate({ documentType: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="documentNumber">Número de Documento *</Label>
          <Input
            id="documentNumber"
            value={data.documentNumber}
            onChange={(e) => onUpdate({ documentNumber: e.target.value })}
            placeholder="Ingrese el número de documento"
          />
        </div>

        <div>
          <Label htmlFor="firstName">Nombres *</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
            placeholder="Nombres completos"
          />
        </div>

        <div>
          <Label htmlFor="lastName">Apellidos *</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => onUpdate({ lastName: e.target.value })}
            placeholder="Apellidos completos"
          />
        </div>

        <div>
          <Label htmlFor="birthDate">Fecha de Nacimiento *</Label>
          <Input
            id="birthDate"
            type="date"
            value={data.birthDate}
            onChange={(e) => onUpdate({ birthDate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="gender">Sexo *</Label>
          <Select value={data.gender} onValueChange={(value) => onUpdate({ gender: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="civilStatus">Estado Civil</Label>
          <Select value={data.civilStatus} onValueChange={(value) => onUpdate({ civilStatus: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CIVIL_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="address">Dirección *</Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder="Dirección completa"
          />
        </div>

        <div>
          <Label htmlFor="city">Ciudad *</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => onUpdate({ city: e.target.value })}
            placeholder="Ciudad de residencia"
          />
        </div>

        <div>
          <Label htmlFor="phone">Teléfono *</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            placeholder="Número de teléfono"
          />
        </div>

        <div>
          <Label htmlFor="personalEmail">Correo Electrónico Personal *</Label>
          <Input
            id="personalEmail"
            type="email"
            value={data.personalEmail}
            onChange={(e) => onUpdate({ personalEmail: e.target.value })}
            placeholder="correo@personal.com"
          />
        </div>
      </div>
    </Card>
  );
};
