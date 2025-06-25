
// Tipos para el sistema de roles
export type AppRole = 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte';

export interface UserRole {
  role: AppRole;
  company_id?: string;
}

export interface RolePermissions {
  modules: string[];
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

// Matriz de permisos por rol
export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  administrador: {
    modules: ['dashboard', 'employees', 'payroll', 'payroll-history', 'vouchers', 'payments', 'reports', 'settings'],
    canEdit: true,
    canDelete: true,
    canExport: true
  },
  rrhh: {
    modules: ['dashboard', 'employees', 'payroll-history', 'vouchers', 'reports'],
    canEdit: true,
    canDelete: false,
    canExport: true
  },
  contador: {
    modules: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
    canEdit: false,
    canDelete: false,
    canExport: true
  },
  visualizador: {
    modules: ['dashboard', 'payroll-history', 'vouchers', 'reports'],
    canEdit: false,
    canDelete: false,
    canExport: false
  },
  soporte: {
    modules: ['dashboard', 'reports'],
    canEdit: false,
    canDelete: false,
    canExport: false
  }
};

// Descripción de roles para la UI
export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  administrador: 'Acceso completo a todas las funcionalidades de la empresa',
  rrhh: 'Gestión de personal sin acceso financiero o de configuración',
  contador: 'Consulta contable sin acceso a empleados o configuración',
  visualizador: 'Consulta básica sin permisos de edición',
  soporte: 'Acceso parcial para diagnóstico técnico'
};
