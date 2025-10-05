import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea un timestamp a distancia relativa en español
 */
export function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true,
      locale: es 
    });
  } catch (error) {
    return 'Fecha no disponible';
  }
}

/**
 * Trunca texto a un máximo de caracteres
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Valida si un ID de conversación es válido
 */
export function isValidConversationId(id: string | null | undefined): boolean {
  return !!id && typeof id === 'string' && id.length > 0;
}

/**
 * Genera un título por defecto basado en la fecha
 */
export function generateDefaultTitle(): string {
  const now = new Date();
  return `Conversación ${now.toLocaleDateString('es-ES', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}
