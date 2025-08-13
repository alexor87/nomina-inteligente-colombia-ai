
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { EmployeeFormData } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LaborInfoSectionProps {
  control: Control<EmployeeFormData>;
  errors: FieldErrors<EmployeeFormData>;
  watchedValues: EmployeeFormData;
  setValue: UseFormSetValue<EmployeeFormData>;
  watch: UseFormWatch<EmployeeFormData>;
  arlRiskLevels: { value: string; label: string; percentage: string }[];
  register: any;
}

export const LaborInfoSection = ({
  control,
  errors,
  watchedValues,
  setValue,
  watch,
  arlRiskLevels,
  register
}: LaborInfoSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Laboral</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Salario Base */}
          <FormField
            control={control}
            name="salarioBase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salario Base *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1300000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo de Contrato */}
          <FormField
            control={control}
            name="tipoContrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Contrato *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                    <SelectItem value="fijo">Término Fijo</SelectItem>
                    <SelectItem value="obra">Por Obra</SelectItem>
                    <SelectItem value="aprendizaje">Contrato de Aprendizaje</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha de Ingreso */}
          <FormField
            control={control}
            name="fechaIngreso"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Ingreso *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Periodicidad de Pago */}
          <FormField
            control={control}
            name="periodicidadPago"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Periodicidad de Pago *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar periodicidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cargo */}
          <FormField
            control={control}
            name="cargo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <FormControl>
                  <Input placeholder="Desarrollador Senior" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Código CIIU */}
          <FormField
            control={control}
            name="codigoCIIU"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código CIIU</FormLabel>
                <FormControl>
                  <Input placeholder="6201" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nivel de Riesgo ARL */}
          <FormField
            control={control}
            name="nivelRiesgoARL"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel de Riesgo ARL</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Nivel 1 - Riesgo Mínimo (0.522%)</SelectItem>
                    <SelectItem value="2">Nivel 2 - Riesgo Bajo (1.044%)</SelectItem>
                    <SelectItem value="3">Nivel 3 - Riesgo Medio (2.436%)</SelectItem>
                    <SelectItem value="4">Nivel 4 - Riesgo Alto (4.350%)</SelectItem>
                    <SelectItem value="5">Nivel 5 - Riesgo Máximo (6.960%)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado del Empleado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="vacaciones">En Vacaciones</SelectItem>
                    <SelectItem value="incapacidad">Incapacitado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contract Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de Jornada */}
          <FormField
            control={control}
            name="tipoJornada"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Jornada</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jornada" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="completa">Jornada Completa</SelectItem>
                    <SelectItem value="parcial">Jornada Parcial</SelectItem>
                    <SelectItem value="horas">Por Horas</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Días de Trabajo */}
          <FormField
            control={control}
            name="diasTrabajo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días de Trabajo por Mes</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="30"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Horas de Trabajo */}
          <FormField
            control={control}
            name="horasTrabajo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas de Trabajo por Día</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="8"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Centro de Costos */}
          <FormField
            control={control}
            name="centroCostos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Costos</FormLabel>
                <FormControl>
                  <Input placeholder="TI001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Beneficios Extralegales */}
        <FormField
          control={control}
          name="beneficiosExtralegales"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Beneficios Extralegales</FormLabel>
                <p className="text-sm text-muted-foreground">
                  El empleado recibe beneficios adicionales a los establecidos por ley
                </p>
              </div>
            </FormItem>
          )}
        />

        {/* Cláusulas Especiales */}
        <FormField
          control={control}
          name="clausulasEspeciales"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cláusulas Especiales</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe cualquier cláusula especial del contrato..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
