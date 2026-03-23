// Feature flags controlled by Vite env vars.
// In production VITE_MAYA_ENABLED is not defined → defaults to false.
export const FEATURES = {
  MAYA_ENABLED: import.meta.env.VITE_MAYA_ENABLED === 'true',
} as const;
