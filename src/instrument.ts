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
  // Filtrar PII antes de enviar a Sentry
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
    }
    return event;
  },
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
