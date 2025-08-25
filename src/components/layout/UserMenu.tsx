
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Settings, Crown } from 'lucide-react';

export const UserMenu = () => {
  const { user, profile, signOut } = useAuth();
  const { roles, isSuperAdmin } = useRoles();
  const navigate = useNavigate();

  if (!user || !profile) return null;

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  
  const getRoleDisplay = () => {
    if (isSuperAdmin) return 'SuperAdmin';
    if (roles.length === 0) return 'Usuario';
    return roles[0]?.role || 'Usuario';
  };

  const displayRole = getRoleDisplay();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar_url || ''} alt={fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {isSuperAdmin && (
            <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {isSuperAdmin ? (
                <Badge variant="default" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  SuperAdmin
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs capitalize">
                  {displayRole}
                </Badge>
              )}
            </div>
            {roles.length > 1 && (
              <p className="text-xs text-muted-foreground">
                +{roles.length - 1} rol{roles.length > 2 ? 'es' : ''} más
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettingsClick}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
