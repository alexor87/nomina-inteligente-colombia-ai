
import { Badge } from '@/components/ui/badge';
import { User, Briefcase, FileText, CreditCard, Shield, Settings } from 'lucide-react';

interface NavigationSidebarProps {
  activeSection: string;
  completionPercentage: number;
  scrollToSection: (sectionId: string) => void;
}

const SECTIONS = [
  { id: 'personal', title: 'Información Personal', icon: User, color: 'bg-blue-50 text-blue-700' },
  { id: 'laboral', title: 'Información Laboral', icon: Briefcase, color: 'bg-green-50 text-green-700' },
  { id: 'contrato', title: 'Detalles del Contrato', icon: FileText, color: 'bg-purple-50 text-purple-700' },
  { id: 'bancaria', title: 'Información Bancaria', icon: CreditCard, color: 'bg-orange-50 text-orange-700' },
  { id: 'afiliaciones', title: 'Afiliaciones', icon: Shield, color: 'bg-red-50 text-red-700' },
  { id: 'personalizados', title: 'Campos Personalizados', icon: Settings, color: 'bg-gray-50 text-gray-700' }
];

export const NavigationSidebar = ({ 
  activeSection, 
  completionPercentage, 
  scrollToSection 
}: NavigationSidebarProps) => {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 sticky top-0 h-screen overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Progreso</h3>
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {completionPercentage}%
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <nav className="space-y-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{section.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
