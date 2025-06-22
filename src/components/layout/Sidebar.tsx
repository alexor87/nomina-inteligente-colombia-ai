
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  userRole: 'admin' | 'company' | 'employee';
}

const sidebarItems = {
  company: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/empleados', label: 'Empleados', icon: '👥' },
    { href: '/comprobantes', label: 'Comprobantes', icon: '📋' },
    { href: '/liquidar-nomina', label: 'Liquidar Nómina', icon: '💵' },
    { href: '/historial-nomina', label: 'Historial de Nómina', icon: '🕓' },
    { href: '/pagos', label: 'Pagos y Dispersión', icon: '💳' },
    { href: '/dian', label: 'DIAN / Nómina Electrónica', icon: '🧾' },
    { href: '/reportes', label: 'Reportes', icon: '📈' },
    { href: '/alertas', label: 'Alertas', icon: '🔔' },
    { href: '/configuracion', label: 'Configuración', icon: '🛠️' },
  ],
  admin: [
    { href: '/admin', label: 'Panel Admin', icon: '🛡️' },
    { href: '/admin/companies', label: 'Empresas', icon: '🏢' },
    { href: '/admin/support', label: 'Soporte', icon: '🎧' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
  ],
  employee: [
    { href: '/profile', label: 'Mi Perfil', icon: '👤' },
    { href: '/payslips', label: 'Colillas', icon: '📄' },
  ]
};

export const Sidebar = ({ isOpen, onClose, onOpen, userRole }: SidebarProps) => {
  const items = sidebarItems[userRole] || [];

  const handleMouseEnter = () => {
    // Solo abrir automáticamente en desktop si no está ya abierto
    if (window.innerWidth >= 1024 && !isOpen) {
      onOpen();
    }
  };

  const handleMouseLeave = () => {
    // Solo cerrar automáticamente en desktop
    if (window.innerWidth >= 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">NóminaCol</h1>
              <p className="text-sm text-gray-500 mt-1">Empresa Demo S.A.S.</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
            >
              ✕
            </button>
          </div>
          
          <nav className="space-y-2">
            {items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => {
                  // Solo cerrar en mobile
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};
