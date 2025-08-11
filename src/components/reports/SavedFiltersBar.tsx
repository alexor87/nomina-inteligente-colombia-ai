
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Star } from 'lucide-react';
import { useReports } from '@/hooks/useReports';

export const SavedFiltersBar: React.FC = () => {
  const { savedFilters, applyFilter, saveFilter, activeReportType } = useReports();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveFilter(name.trim(), activeReportType);
    setName('');
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Saved filters list */}
      {savedFilters.length > 0 && (
        <div>
          <Label className="text-sm">Filtros guardados</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {savedFilters.map((f) => (
              <Badge key={f.id} variant="outline" className="cursor-pointer" onClick={() => applyFilter(f)}>
                <Star className="h-3 w-3 mr-1" />
                {f.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Save current filters */}
      <div className="flex items-center gap-2">
        {saving ? (
          <>
            <Input
              placeholder="Nombre del filtro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
            />
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSaving(false); setName(''); }}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
            <Save className="h-4 w-4 mr-1" /> Guardar filtro
          </Button>
        )}
      </div>
    </div>
  );
};
