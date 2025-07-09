import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnified } from '@/types/employee-unified';

interface ImportConfirmationStepProps {
  data: any[];
  mapping: Record<string, string>;
  onConfirm: (employees: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onBack: () => void;
}

export const ImportConfirmationStep: React.FC<ImportConfirmationStepProps> = ({ data, mapping, onConfirm, onBack }) => {
  const { toast } = useToast();

  const handleConfirm = () => {
    try {
      const employeesToCreate: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>[] = data.map(row => {
        // Ensure that required fields are present in the mapping
        if (!mapping.cedula || !mapping.tipoDocumento || !mapping.nombre || !mapping.apellido || !mapping.email || !mapping.telefono || !mapping.salarioBase || !mapping.tipoContrato || !mapping.fechaIngreso || !mapping.periodicidadPago || !mapping.cargo || !mapping.eps || !mapping.afp || !mapping.arl || !mapping.cajaCompensacion || !mapping.banco || !mapping.tipoCuenta || !mapping.numeroCuenta || !mapping.titularCuenta) {
          throw new Error('Faltan campos requeridos en el mapeo.');
        }

        const employeeData = {
          cedula: row[mapping.cedula],
          tipoDocumento: row[mapping.tipoDocumento] || 'CC',
          nombre: row[mapping.nombre],
          apellido: row[mapping.apellido],
          email: row[mapping.email],
          telefono: row[mapping.telefono],
          salarioBase: Number(row[mapping.salarioBase]) || 0,
          tipoContrato: (row[mapping.tipoContrato] || 'indefinido') as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje',
          fechaIngreso: row[mapping.fechaIngreso] || new Date().toISOString().split('T')[0],
          periodicidadPago: (row[mapping.periodicidadPago] === 'semanal' ? 'quincenal' : row[mapping.periodicidadPago] || 'mensual') as 'mensual' | 'quincenal',
          cargo: row[mapping.cargo],
          eps: row[mapping.eps],
          afp: row[mapping.afp],
          arl: row[mapping.arl],
          cajaCompensacion: row[mapping.cajaCompensacion],
          banco: row[mapping.banco],
          tipoCuenta: (row[mapping.tipoCuenta] || 'ahorros') as 'ahorros' | 'corriente',
          numeroCuenta: row[mapping.numeroCuenta],
          titularCuenta: row[mapping.titularCuenta],
          // ✅ FIXED: Add missing required properties
          tipoJornada: 'completa' as const,
          formaPago: 'dispersion' as const,
          regimenSalud: 'contributivo' as const,
          estadoAfiliacion: 'pendiente' as const,
          estado: 'activo' as const,
          custom_fields: {}
        };

        return employeeData;
      });

      onConfirm(employeesToCreate);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Confirmar Importación</h2>
      <p className="mb-4">
        Por favor, revise los datos antes de confirmar la importación.
      </p>

      <Table>
        <TableCaption>Vista previa de los datos a importar</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Cédula</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Apellido</TableHead>
            <TableHead>Email</TableHead>
            {/* Add more headers based on your mapping */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{row[mapping.cedula]}</TableCell>
              <TableCell>{row[mapping.nombre]}</TableCell>
              <TableCell>{row[mapping.apellido]}</TableCell>
              <TableCell>{row[mapping.email]}</TableCell>
              {/* Add more data cells based on your mapping */}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={handleConfirm}>Confirmar Importación</Button>
      </div>
    </div>
  );
};
