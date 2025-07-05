
import { useState, useCallback } from 'react';

export interface NovedadEntry {
  id: string;
  tipo_novedad: string;
  subtipo?: string;
  valor: number;
  horas?: number;
  dias?: number;
  observacion?: string;
  [key: string]: any;
}

export const useMultipleNovedadEntries = <T extends NovedadEntry>(
  initialEntries: T[] = []
) => {
  const [entries, setEntries] = useState<T[]>(initialEntries);

  const addEntry = useCallback((entry: Omit<T, 'id'>) => {
    const newEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`
    } as T;
    
    setEntries(prev => [...prev, newEntry]);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<T>) => {
    setEntries(prev => 
      prev.map(entry => 
        entry.id === id ? { ...entry, ...updates } : entry
      )
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  const getTotalValue = useCallback(() => {
    return entries.reduce((sum, entry) => sum + entry.valor, 0);
  }, [entries]);

  return {
    entries,
    addEntry,
    updateEntry,
    removeEntry,
    clearEntries,
    getTotalValue
  };
};
