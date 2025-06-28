
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface NovedadCountBadgeProps {
  count: number;
}

export const NovedadCountBadge = ({ count }: NovedadCountBadgeProps) => {
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-sm">
      Novedades: {count}
    </Badge>
  );
};
