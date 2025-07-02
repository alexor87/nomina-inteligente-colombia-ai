
import { useState } from 'react';
import { ReportFilters } from '@/types/reports';

export const useReports = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getPayrollSummaryReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      // Mock data generation for payroll summary
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      const costCenters = ['Administración', 'Ventas', 'Producción', 'Logística'];
      
      for (let i = 0; i < 15; i++) {
        mockData.push({
          employeeName: employees[i % employees.length],
          period: '2024-01',
          totalEarnings: 2800000 + (i * 150000),
          totalDeductions: 560000 + (i * 30000),
          netPay: 2240000 + (i * 120000),
          employerContributions: 588000 + (i * 31500),
          costCenter: costCenters[i % costCenters.length]
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getLaborCostReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      
      for (let i = 0; i < 15; i++) {
        mockData.push({
          employeeName: employees[i % employees.length],
          baseSalary: 2800000 + (i * 100000),
          benefits: 280000 + (i * 10000),
          overtime: 150000 + (i * 25000),
          bonuses: 100000 + (i * 15000),
          employerContributions: 588000 + (i * 21000),
          totalCost: 3918000 + (i * 171000),
          costCenter: `Centro ${i % 4 + 1}`
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getSocialSecurityReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      
      for (let i = 0; i < 15; i++) {
        const baseSalary = 2800000 + (i * 100000);
        mockData.push({
          employeeName: employees[i % employees.length],
          healthEmployee: baseSalary * 0.04,
          healthEmployer: baseSalary * 0.085,
          pensionEmployee: baseSalary * 0.04,
          pensionEmployer: baseSalary * 0.12,
          arl: baseSalary * 0.00522,
          compensationBox: baseSalary * 0.04,
          total: baseSalary * (0.04 + 0.085 + 0.04 + 0.12 + 0.00522 + 0.04)
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getNoveltyHistoryReport = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const employees = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Rodríguez', 'Luis Martínez'];
      const noveltyTypes = ['Horas Extra', 'Bonificación', 'Licencia', 'Incapacidad'];
      
      for (let i = 0; i < 20; i++) {
        mockData.push({
          employeeName: employees[i % employees.length],
          noveltyType: noveltyTypes[i % noveltyTypes.length],
          startDate: `2024-01-${(i % 28) + 1}`,
          endDate: `2024-01-${(i % 28) + 3}`,
          amount: 50000 + (i * 25000),
          status: 'Aprobada'
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountingExports = async (filters: ReportFilters) => {
    setIsLoading(true);
    try {
      const mockData = [];
      const accounts = ['51050501 - Salarios', '51051001 - Cesantías', '51051501 - Prima de Servicios'];
      
      for (let i = 0; i < 10; i++) {
        mockData.push({
          account: accounts[i % accounts.length],
          debit: 15000000 + (i * 500000),
          credit: 0,
          description: `Provisión nómina enero 2024`,
          period: '2024-01'
        });
      }
      
      return mockData;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    getPayrollSummaryReport,
    getLaborCostReport,
    getSocialSecurityReport,
    getNoveltyHistoryReport,
    getAccountingExports
  };
};
