
// Navigation utility functions for voice assistant

export const getRouteForSection = (section: string): string | null => {
  const sectionMap: Record<string, string> = {
    'empleados': '/app/employees',
    'employees': '/app/employees',
    'nomina': '/app/payroll',
    'nómina': '/app/payroll',
    'payroll': '/app/payroll',
    'liquidacion': '/app/payroll',
    'liquidación': '/app/payroll',
    'reportes': '/app/reports',
    'reports': '/app/reports',
    'prestaciones': '/app/prestaciones-sociales',
    'prestaciones-sociales': '/app/prestaciones-sociales',
    'configuracion': '/app/settings',
    'configuración': '/app/settings',
    'settings': '/app/settings',
    'dashboard': '/app/dashboard',
    'inicio': '/app/dashboard',
    'home': '/app/dashboard',
    'vacaciones': '/app/vacations-absences',
    'ausencias': '/app/vacations-absences',
    'vacations': '/app/vacations-absences',
    'absences': '/app/vacations-absences'
  };

  return sectionMap[section.toLowerCase()] || null;
};

export const getSectionDisplayName = (section: string): string => {
  const displayMap: Record<string, string> = {
    'empleados': 'empleados',
    'employees': 'empleados',
    'nomina': 'nómina',
    'nómina': 'nómina',
    'payroll': 'nómina',
    'liquidacion': 'liquidación de nómina',
    'liquidación': 'liquidación de nómina',
    'reportes': 'reportes',
    'reports': 'reportes',
    'prestaciones': 'prestaciones sociales',
    'prestaciones-sociales': 'prestaciones sociales',
    'configuracion': 'configuración',
    'configuración': 'configuración',
    'settings': 'configuración',
    'dashboard': 'dashboard',
    'inicio': 'inicio',
    'home': 'inicio',
    'vacaciones': 'vacaciones y ausencias',
    'ausencias': 'vacaciones y ausencias',
    'vacations': 'vacaciones y ausencias',
    'absences': 'vacaciones y ausencias'
  };

  return displayMap[section.toLowerCase()] || section;
};
