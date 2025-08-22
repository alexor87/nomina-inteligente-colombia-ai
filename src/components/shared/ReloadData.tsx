
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ReloadDataProps {
  refetch: () => void;
  isLoading?: boolean;
}

export const ReloadData: React.FC<ReloadDataProps> = ({ refetch, isLoading = false }) => {
  return (
    <Button
      onClick={refetch}
      variant="outline"
      size="sm"
      disabled={isLoading}
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
    </Button>
  );
};
