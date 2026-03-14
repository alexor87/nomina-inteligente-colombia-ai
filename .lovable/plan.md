

# Plan: Ampliar Integraciones Contables a Múltiples Proveedores

Actualmente el sistema solo soporta Siigo y Alegra con adapters hardcodeados. Se necesita abrir el sistema para soportar cualquier software contable que ofrezca API REST (World Office, Helisa, Contai, TNS, Monica, etc.) y también integraciones genéricas vía webhook o archivo plano.

## Cambios

### 1. Nuevo tipo de proveedor extensible

Reemplazar el tipo `AccountingProvider = 'siigo' | 'alegra'` por un sistema abierto que incluya proveedores predefinidos y un modo "personalizado":

Proveedores predefinidos: `siigo`, `alegra`, `world_office`, `helisa`, `contai`, `monica`, `tns`  
Modo genérico: `webhook` (envía JSON a un endpoint configurable) y `csv_export` (genera archivo descargable)

### 2. Edge Function — Adapter genérico

Agregar un `GenericWebhookAdapter` que envíe el payload de asientos a cualquier URL que el usuario configure. Cada proveedor predefinido mantiene su adapter con la URL base y formato de autenticación correctos. El adapter genérico permite pegar cualquier endpoint REST.

### 3. UI — Selector de proveedores ampliado

Rediseñar el paso "select" del wizard:
- Grid con logos/iconos de los proveedores conocidos (Siigo, Alegra, World Office, Helisa, Contai, TNS, Monica)
- Opción "Otro / Webhook personalizado" para APIs genéricas
- Opción "Exportar CSV" para quienes no tienen API
- El paso de credenciales se adapta según el proveedor (algunos usan API key + user, otros usan token Bearer, otros usan URL + secret)

### 4. Configuración por proveedor

Cada proveedor tiene metadata de configuración:

```text
PROVIDER_CONFIG = {
  siigo:        { name: "Siigo", auth: "basic", fields: ["username", "api_key"], baseUrl: "https://api.siigo.com/v1" },
  alegra:       { name: "Alegra", auth: "basic", fields: ["email", "api_key"], baseUrl: "https://api.alegra.com/api/v1" },
  world_office: { name: "World Office", auth: "bearer", fields: ["api_key"], baseUrl: configurable },
  helisa:       { name: "Helisa", auth: "basic", fields: ["username", "api_key"], baseUrl: "https://api.helisa.com" },
  contai:       { name: "Contai", auth: "bearer", fields: ["api_key"], baseUrl: "https://api.contai.co" },
  webhook:      { name: "Webhook Personalizado", auth: "custom", fields: ["webhook_url", "api_key", "header_name"] },
  csv_export:   { name: "Exportar CSV/Excel", auth: "none", fields: [] }
}
```

### 5. Base de datos

Migración para ampliar la columna `provider` en `accounting_integrations`:
- Cambiar de enum restringido a `text` con check constraint para los valores válidos
- Agregar columna `provider_config jsonb` para guardar la URL base, headers custom, etc.

### 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/services/AccountingIntegrationService.ts` | Ampliar tipo `AccountingProvider`, agregar config por proveedor |
| `src/components/settings/AccountingSoftwareWizard.tsx` | Grid de proveedores, formulario dinámico de credenciales |
| `supabase/functions/accounting-sync/index.ts` | Agregar adapters: `GenericWebhookAdapter`, `BearerTokenAdapter`, `CsvExportAdapter` |
| Migration SQL | Ampliar columna `provider`, agregar `provider_config` |

### 7. Archivos nuevos

| Archivo | Descripción |
|---|---|
| `src/config/accountingProviders.ts` | Registry centralizado de proveedores con metadata, labels, iconos, campos requeridos |

