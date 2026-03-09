import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuperAdminService } from '@/services/SuperAdminService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Receipt } from 'lucide-react';

const AdminSubscriptionsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-subscription-events'],
    queryFn: () => SuperAdminService.getSubscriptionEvents()
  });

  const filtered = events?.filter(e =>
    !search || e.company_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Historial de Suscripciones</h1>
        <p className="text-muted-foreground text-sm">Timeline de cambios de plan y estado</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por empresa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Cargando eventos...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay eventos de suscripción registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(event => (
                <div key={event.id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{event.company_name}</span>
                      {event.previous_plan !== event.new_plan ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs capitalize">{event.previous_plan || 'N/A'}</Badge>
                          <span className="text-muted-foreground text-xs">→</span>
                          <Badge className="text-xs capitalize bg-primary/10 text-primary">{event.new_plan}</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs capitalize">{event.previous_status || 'N/A'}</Badge>
                          <span className="text-muted-foreground text-xs">→</span>
                          <Badge className={`text-xs capitalize ${event.new_status === 'activa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {event.new_status}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">{event.reason}</p>
                    <p className="text-muted-foreground text-xs mt-1">{new Date(event.created_at).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptionsPage;
