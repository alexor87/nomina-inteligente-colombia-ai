
import { UserMenu } from './UserMenu';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
  user?: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
}

export const Header = ({ onMenuClick, sidebarCollapsed = false }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {sidebarCollapsed && (
          <button
            onClick={onMenuClick}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        
        <div className="flex items-center space-x-4 ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
