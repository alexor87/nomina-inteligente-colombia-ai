
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { EmployeeUnified } from '@/types/employee-unified';

interface LaborInfoSectionProps {
  formData: Partial<EmployeeUnified>;
  updateFormData: (data: Partial<EmployeeUnified>) => void;
  errors: Record<string, string>;
}

export const LaborInfoSection = ({ formData, updateFormData, errors }: LaborInfoSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cargo">Cargo *</Label>
          <Input
            id="cargo"
            value={formData.cargo || ''}
            onChange={(e) => updateFormData({ cargo: e.target.value })}
            placeholder="Desarrollador Senior"
          />
          {errors.cargo && <p className="text-red-500 text-sm mt-1">{errors.cargo}</p>}
        </div>

        <div>
          <Label htmlFor="salarioBase">Salario Base *</Label>
          <Input
            id="salarioBase"
            type="number"
            value={formData.salarioBase || ''}
            onChange={(e) => updateFormData({ salarioBase: Number(e.target.value) })}
            placeholder="2500000"
          />
          {errors.salarioBase && <p className="text-red-500 text-sm mt-1">{errors.salarioBase}</p>}
        </div>

        <div>
          <Label htmlFor="tipoContrato">Tipo de Contrato *</Label>
          <Select onValueChange={(value) => updateFormData({ tipoContrato: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="indefinido">Indefinido</SelectItem>
              <SelectItem value="fijo">Término Fijo</SelectItem>
              <SelectItem value="obra">Obra</SelectItem>
              <SelectItem value="aprendizaje">Contrato de Aprendizaje</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
          <Input
            id="fechaIngreso"
            type="date"
            value={formData.fechaIngreso || ''}
            onChange={(e) => updateFormData({ fechaIngreso: e.target.value })}
          />
          {errors.fechaIngreso && <p className="text-red-500 text-sm mt-1">{errors.fechaIngreso}</p>}
        </div>

        <div>
          <Label htmlFor="fechaFirmaContrato">Fecha de Firma del Contrato</Label>
          <Input
            id="fechaFirmaContrato"
            type="date"
            value={formData.fechaFirmaContrato || ''}
            onChange={(e) => updateFormData({ fechaFirmaContrato: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="fechaFinalizacionContrato">Fecha de Finalización del Contrato</Label>
          <Input
            id="fechaFinalizacionContrato"
            type="date"
            value={formData.fechaFinalizacionContrato || ''}
            onChange={(e) => updateFormData({ fechaFinalizacionContrato: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
          <Select onValueChange={(value) => updateFormData({ periodicidadPago: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar periodicidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tipoJornada">Tipo de Jornada</Label>
          <Select onValueChange={(value) => updateFormData({ tipoJornada: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar jornada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completa">Completa</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="horas">Por Horas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="diasTrabajo">Días de Trabajo (mes)</Label>
          <Input
            id="diasTrabajo"
            type="number"
            value={formData.diasTrabajo || ''}
            onChange={(e) => updateFormData({ diasTrabajo: Number(e.target.value) })}
            placeholder="30"
          />
        </div>

        <div>
          <Label htmlFor="horasTrabajo">Horas de Trabajo (día)</Label>
          <Input
            id="horasTrabajo"
            type="number"
            value={formData.horasTrabajo || ''}
            onChange={(e) => updateFormData({ horasTrabajo: Number(e.target.value) })}
            placeholder="8"
          />
        </div>

        <div>
          <Label htmlFor="codigoCiiu">Código CIIU</Label>
          <Input
            id="codigoCiiu"
            value={formData.codigoCiiu || ''}
            onChange={(e) => updateFormData({ codigoCiiu: e.target.value })}
            placeholder="6201"
          />
        </div>

        <div>
          <Label htmlFor="nivelRiesgoArl">Nivel de Riesgo ARL</Label>
          <Select onValueChange={(value) => updateFormData({ nivelRiesgoArl: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I">Nivel I</SelectItem>
              <SelectItem value="II">Nivel II</SelectItem>
              <SelectItem value="III">Nivel III</SelectItem>
              <SelectItem value="IV">Nivel IV</SelectItem>
              <SelectItem value="V">Nivel V</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="centroCostos">Centro de Costos</Label>
          <Input
            id="centroCostos"
            value={formData.centroCostos || ''}
            onChange={(e) => updateFormData({ centroCostos: e.target.value })}
            placeholder="CC001"
          />
        </div>

        <div>
          <Label htmlFor="estado">Estado</Label>
          <Select onValueChange={(value) => updateFormData({ estado: value as any })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="vacaciones">En Vacaciones</SelectItem>
              <SelectItem value="incapacidad">Incapacitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="beneficiosExtralegales"
          checked={formData.beneficiosExtralegales || false}
          onCheckedChange={(checked) => updateFormData({ beneficiosExtralegales: !!checked })}
        />
        <Label htmlFor="beneficiosExtralegales">Tiene beneficios extralegales</Label>
      </div>

      <div>
        <Label htmlFor="clausulasEspeciales">Cláusulas Especiales</Label>
        <Textarea
          id="clausulasEspeciales"
          value={formData.clausulasEspeciales || ''}
          onChange={(e) => updateFormData({ clausulasEspeciales: e.target.value })}
          placeholder="Descripción de cláusulas especiales del contrato..."
          rows={3}
        />
      </div>
    </div>
  );
};
