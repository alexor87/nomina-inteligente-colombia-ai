import { useMemo } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { isAfter, parseISO, addMonths } from 'date-fns'; // Fixed import

export const useEmployeeCompliance = (employees: EmployeeWithStatus[]) => {
  const complianceData = useMemo(() => {
    const issues: any[] = [];
    const warnings: any[] = [];
    
    employees.forEach(employee => {
      // Check for missing affiliations
      if (!employee.eps || !employee.afp || !employee.arl) {
        issues.push({
          employeeId: employee.id,
          type: 'missing_affiliations',
          message: `${employee.nombre} ${employee.apellido} tiene afiliaciones incompletas`,
          priority: 'high'
        });
      }

      // Check for contract expiration
      if (employee.fechaFinalizacionContrato || employee.contratoVencimiento) {
        const expirationDate = employee.fechaFinalizacionContrato || employee.contratoVencimiento;
        if (expirationDate) {
          const expDate = parseISO(expirationDate);
          const warningDate = addMonths(new Date(), 1); // 1 month from now
          
          if (isAfter(warningDate, expDate)) {
            warnings.push({
              employeeId: employee.id,
              type: 'contract_expiring',
              message: `Contrato de ${employee.nombre} ${employee.apellido} vence pronto`,
              priority: 'medium'
            });
          }
        }
      }

      // Check for outdated documents or certifications
      // if (employee.lastCertificationDate) {
      //   const lastCertDate = parseISO(employee.lastCertificationDate);
      //   const renewalDate = addYears(lastCertDate, 2); // Example: Certifications need renewal every 2 years
      //   if (isBefore(renewalDate, new Date())) {
      //     issues.push({
      //       employeeId: employee.id,
      //       type: 'certification_expired',
      //       message: `Certificación de ${employee.nombre} ${employee.apellido} ha expirado`,
      //       priority: 'medium'
      //     });
      //   }
      // }
    });

    return {
      issues,
      warnings,
      totalIssues: issues.length,
      totalWarnings: warnings.length
    };
  }, [employees]);

  return complianceData;
};
