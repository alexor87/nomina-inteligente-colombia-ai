import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.MODE !== "development",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Captura el 100% de transacciones en staging, 10% en producción
  tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
  // Captura el 10% de sesiones para replay en producción, 100% en staging
  replaysSessionSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
  // Captura el 100% de sesiones con errores
  replaysOnErrorSampleRate: 1.0,
});

// En producción, silenciar console.log/info/debug/warn para evitar
// exposición de datos sensibles (emails, salarios, cédulas) en DevTools.
// console.error se mantiene activo: lo requiere Sentry y el diagnóstico real.
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}
