
import { LoadingSpinner } from './LoadingSpinner';

interface AppLoadingProps {
  message?: string;
}

export const AppLoading = ({ message = "Cargando..." }: AppLoadingProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
