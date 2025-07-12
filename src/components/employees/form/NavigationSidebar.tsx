
import { cn } from '@/lib/utils';

interface NavigationSidebarProps {
  activeSection: string;
  completionPercentage: number;
  scrollToSection: (sectionId: string) => void;
}

export const NavigationSidebar = ({ 
  activeSection, 
  completionPercentage, 
  scrollToSection 
}: NavigationSidebarProps) => {
  const sections = [
    { id: 'personal', title: 'Información Personal', icon: '👤' },
    { id: 'laboral', title: 'Información Laboral', icon: '💼' },
    { id: 'afiliaciones', title: 'Afiliaciones', icon: '🏥' },
    { id: 'bancaria', title: 'Información Bancaria', icon: '🏦' },
    { id: 'vacaciones', title: 'Vacaciones', icon: '🏖️' },
    { id: 'personalizados', title: 'Campos Personalizados', icon: '⚙️' }
  ];

  const handleSectionClick = (sectionId: string) => {
    console.log('🖱️ Clicked section:', sectionId);
    scrollToSection(sectionId);
  };

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 h-full p-6">
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Progreso del formulario</h3>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{completionPercentage}% completado</p>
      </div>

      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            className={cn(
              "w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
              activeSection === section.id
                ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            )}
          >
            <span className="mr-3 text-lg">{section.icon}</span>
            {section.title}
          </button>
        ))}
      </nav>
    </div>
  );
};
