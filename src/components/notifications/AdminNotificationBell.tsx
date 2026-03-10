import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { SuperAdminService, AdminNotification } from '@/services/SuperAdminService';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const priorityIcons = {
  info: <Info className="h-4 w-4 text-blue-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  critical: <AlertCircle className="h-4 w-4 text-red-600" />,
};

export const AdminNotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<(AdminNotification & { read: boolean })[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ id: string; plan: string | null; status: string | null } | null>(null);

  useEffect(() => {
    loadCompanyInfo();
  }, [user]);

  useEffect(() => {
    if (companyInfo && user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [companyInfo, user]);

  const loadCompanyInfo = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return;

    const { data: sub } = await supabase
      .from('company_subscriptions')
      .select('plan_type, status')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    setCompanyInfo({
      id: profile.company_id,
      plan: sub?.plan_type || null,
      status: sub?.status || null,
    });
  };

  const loadNotifications = async () => {
    if (!user || !companyInfo) return;
    try {
      const notifs = await SuperAdminService.getUserNotificationsForCompany(
        user.id,
        companyInfo.plan,
        companyInfo.status
      );
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading admin notifications:', err);
    }
  };

  const markAsRead = async (notifId: string) => {
    if (!user || !companyInfo) return;
    try {
      await SuperAdminService.markNotificationRead(notifId, user.id, companyInfo.id);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4 flex justify-between items-center">
          <h3 className="font-semibold">Avisos del Sistema</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay avisos</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !n.read
                      ? n.priority === 'critical'
                        ? 'bg-red-50 border-l-4 border-l-red-500'
                        : 'bg-blue-50 border-l-4 border-l-blue-500'
                      : ''
                  }`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    {priorityIcons[n.priority] || priorityIcons.info}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{n.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
