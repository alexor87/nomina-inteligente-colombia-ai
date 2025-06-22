
import { UserMenu } from './UserMenu';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  user?: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex items-center space-x-4 ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
