import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { SecureEmployeeService } from '@/services/SecureEmployeeService';

interface VacationBalanceCardProps {
  employee: EmployeeWithStatus | null;
}

export const VacationBalanceCard: React.FC<VacationBalanceCardProps> = ({ employee }) => {
  const [balance, setBalance] = useState<number>(0);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVacationBalance();
  }, [employee]);

  const loadVacationBalance = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      const companyId = (employee as any).company_id || employee.empresaId;
      
      if (!companyId) {
        console.error('No company ID available for vacation balance');
        return;
      }

      const employeeData = await SecureEmployeeService.getEmployeeById(employee.id);

      if (employeeData) {
        // Assuming there's a custom field for vacation balance
        const vacationBalance = employeeData.custom_fields?.vacationBalance || 0;
        setBalance(Number(vacationBalance));
        setNewBalance(Number(vacationBalance));
      } else {
        setError('Empleado no encontrado');
      }
    } catch (error) {
      console.error('Error loading vacation balance:', error);
      setError('Error al cargar el balance de vacaciones');
    } finally {
      setLoading(false);
    }
  };

  const updateVacationBalance = async (newBalance: number) => {
    if (!employee?.id) return;

    try {
      setUpdating(true);
      const companyId = (employee as any).company_id || employee.empresaId;
      
      if (!companyId) {
        console.error('No company ID available for vacation update');
        return;
      }

      const employeeData = await SecureEmployeeService.getEmployeeById(employee.id);

      if (employeeData) {
        // Update the custom field for vacation balance
        const updatedCustomFields = {
          ...employeeData.custom_fields,
          vacationBalance: newBalance
        };

        const result = await SecureEmployeeService.updateEmployee(employee.id, {
          custom_fields: updatedCustomFields
        });

        if (result.success) {
          setBalance(newBalance);
          setNewBalance(newBalance);
          toast({
            title: "Balance de vacaciones actualizado",
            description: `El balance de vacaciones de ${employee.nombre} ha sido actualizado a ${newBalance}`,
            className: "border-green-200 bg-green-50"
          });
        } else {
          toast({
            title: "Error al actualizar el balance",
            description: result.error || "No se pudo actualizar el balance de vacaciones",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Empleado no encontrado",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating vacation balance:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBalance(Number(e.target.value));
  };

  const handleUpdateBalance = () => {
    updateVacationBalance(newBalance);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance de Vacaciones</CardTitle>
        <CardDescription>
          Gestiona el balance de vacaciones de este empleado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p>Cargando balance...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            <div>
              <Label htmlFor="balance">Balance Actual</Label>
              <Input
                id="balance"
                type="number"
                value={balance}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="newBalance">Nuevo Balance</Label>
              <Input
                id="newBalance"
                type="number"
                value={newBalance}
                onChange={handleBalanceChange}
              />
            </div>
            <Button onClick={handleUpdateBalance} disabled={updating}>
              {updating ? 'Actualizando...' : 'Actualizar Balance'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
