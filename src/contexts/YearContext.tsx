import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface YearContextType {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  availableYears: string[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

interface YearProviderProps {
  children: ReactNode;
}

export const YearProvider: React.FC<YearProviderProps> = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    // Inicializar desde localStorage o usar año actual
    const stored = localStorage.getItem('payroll_selected_year');
    return stored || new Date().getFullYear().toString();
  });

  // Generar años disponibles (2021-2040)
  const availableYears = Array.from({ length: 20 }, (_, i) => (2021 + i).toString());

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem('payroll_selected_year', selectedYear);
  }, [selectedYear]);

  const value: YearContextType = {
    selectedYear,
    setSelectedYear,
    availableYears
  };

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
};

export const useYear = (): YearContextType => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
};