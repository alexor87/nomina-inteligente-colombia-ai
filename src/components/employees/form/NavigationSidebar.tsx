
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationSidebarProps {
  activeSection: string;
  completionPercentage: number;
  scrollToSection: (sectionId: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export const NavigationSidebar = ({ 
  activeSection, 
  completionPercentage, 
  scrollToSection,
  collapsed,
  onToggle
}: NavigationSidebarProps) => {
  const sections = [
    { id: 'personal', title: 'Información Personal', icon: '👤' },
    { id: 'laboral', title: 'Información Laboral', icon: '💼' },
    { id: 'afiliaciones', title: 'Afiliaciones', icon: '🏥' },
    { id: 'bancaria', title: 'Información Bancaria', icon: '🏦' },
    { id: 'personalizados', title: 'Campos Personalizados', icon: '⚙️' }
  ];

  return (
    <div className={cn(
      "bg-gray-50 border-r border-gray-200 min-h-screen fixed left-0 top-0 z-50 transition-all duration-300",
      collapsed ? "w-16" : "w-72"
    )}>
      {/* Toggle button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 min-h-[60px]">
        {!collapsed && (
          <h2 className="text-sm font-medium text-gray-900">Navegación</h2>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Progress section - only show when expanded */}
      {!collapsed && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Progreso del formulario</h3>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{completionPercentage}% completado</p>
        </div>
      )}

      {/* Navigation sections */}
      <nav className="p-3 space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "w-full flex items-center text-sm font-medium rounded-lg transition-colors text-left",
              collapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
              activeSection === section.id
                ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            )}
            title={collapsed ? section.title : undefined}
          >
            <span className={cn(
              "text-lg",
              collapsed ? "" : "mr-3"
            )}>
              {section.icon}
            </span>
            {!collapsed && (
              <span className="truncate">{section.title}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};
