

# Plan: Soporte para cualquier software contable (proveedor personalizado)

## Problema
Actualmente solo se pueden seleccionar 9 proveedores predefinidos. El usuario necesita poder conectar con **cualquier** software contable, no solo los listados.

## Solución
Agregar una opción **"Otro software"** que permita al usuario definir manualmente el nombre, URL, tipo de autenticación y credenciales de cualquier software.

## Cambios

### 1. `src/config/accountingProviders.ts`
- Agregar un nuevo provider `custom` con categoría `generic`
- Campos: nombre del software, URL del endpoint, tipo de auth (dropdown), token/API key, header de autenticación
- El `custom` provider usa `authType: 'custom'` y `baseUrl: null`

### 2. `src/components/settings/AccountingSoftwareWizard.tsx`
- En el paso de credenciales para `custom`: mostrar un campo extra para que el usuario escriba el **nombre** de su software
- Guardar ese nombre en `provider_config.custom_name`
- En la vista "connected", mostrar el nombre personalizado en vez de "custom"

### 3. `src/services/AccountingIntegrationService.ts`
- Actualizar el tipo `AccountingProvider` para incluir `'custom'`

### 4. `src/config/accountingProviders.ts` — `getProviderName()`
- Si el provider es `custom`, buscar el nombre en `provider_config.custom_name` (fallback: "Software personalizado")

### 5. Migración SQL
- Actualizar la check constraint de `accounting_integrations.provider` para incluir `'custom'` (y los otros 7 proveedores que faltan en la constraint actual, que es la causa del error reportado anteriormente)

### 6. Edge Function `accounting-sync`
- El provider `custom` usará el mismo `WebhookAdapter` existente — no requiere cambios adicionales

## Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/config/accountingProviders.ts` | Agregar provider `custom`, actualizar `getProviderName` |
| `src/components/settings/AccountingSoftwareWizard.tsx` | Campo "nombre del software" para custom, mostrar nombre en vista connected |
| Migración SQL | Actualizar check constraint con todos los providers incluyendo `custom` |

