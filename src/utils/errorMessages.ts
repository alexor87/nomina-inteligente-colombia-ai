/**
 * Mapea errores internos a mensajes genéricos para el usuario.
 * Evita exponer detalles de BD, SQL, o infraestructura en la UI.
 */
export function getUserFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  // Errores de autenticación
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('token'))
    return 'Error de autenticación. Por favor inicia sesión nuevamente.';

  // Errores de permisos / RLS
  if (lower.includes('rls') || lower.includes('permission') || lower.includes('policy') || lower.includes('forbidden'))
    return 'No tienes permiso para realizar esta operación.';

  // Errores de constraint / FK
  if (lower.includes('foreign key') || lower.includes('fk_') || lower.includes('violates'))
    return 'No se puede completar la operación porque hay datos relacionados.';

  // Errores de duplicados
  if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('already exists'))
    return 'Ya existe un registro con estos datos.';

  // Errores de conexión
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout') || lower.includes('econnrefused'))
    return 'Error de conexión. Verifica tu conexión a internet e intenta de nuevo.';

  // Errores de validación
  if (lower.includes('required') || lower.includes('invalid') || lower.includes('must be'))
    return 'Datos inválidos. Verifica la información e intenta de nuevo.';

  // Errores de usuario no autenticado
  if (lower.includes('no autenticado') || lower.includes('not authenticated'))
    return 'Sesión expirada. Por favor inicia sesión nuevamente.';

  // Default genérico
  return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
}
