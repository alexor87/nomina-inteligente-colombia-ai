

# Plan: Integración Directa con Siigo y Alegra

## Lo que ya existe
- ✅ Tabla `accounting_account_mappings` con mapeo PUC
- ✅ `AccountingMappingService.ts` para CRUD de mapeos
- ✅ `PUCMappingEditor.tsx` para editar cuentas

## Lo que falta construir

### 1. Base de Datos (2 tablas nuevas)

**`accounting_integrations`** - Configuración de conexión
```sql
id, company_id, provider (siigo/alegra), 
credentials (jsonb encriptado), is_active, auto_sync,
last_sync_at, created_at, updated_at
```

**`accounting_sync_logs`** - Historial de sincronizaciones
```sql
id, company_id, integration_id, period_id, provider,
status (success/error/pending), entries_sent, 
response_data (jsonb), error_message, created_at
```

### 2. Edge Function: `accounting-sync`

Endpoints:
- `POST /test-connection` - Valida credenciales contra API real
- `POST /sync` - Envía asientos de un período

Flujo de sync:
1. Lee `accounting_integrations` de la empresa
2. Genera asientos desde `payrolls` usando mapeo PUC
3. Transforma al formato del provider (Siigo/Alegra)
4. Envía a la API (`POST /v1/journals`)
5. Registra resultado en `accounting_sync_logs`

### 3. UI: Wizard de Conexión

Reemplazar el placeholder "Software Contable" en IntegracionesSettings con:

```
Paso 1: Seleccionar software
┌─────────┐  ┌─────────┐
│  Siigo  │  │ Alegra  │
└─────────┘  └─────────┘

Paso 2: Ingresar credenciales
┌─────────────────────────────────┐
│ Email: [________________]       │
│ Token API: [________________]   │
│                                 │
│ 💡 ¿Dónde encontrar el token?   │
│    Siigo → Integraciones → API  │
│                                 │
│ [Probar conexión]               │
└─────────────────────────────────┘

Paso 3: Configuración
┌─────────────────────────────────┐
│ ☑️ Enviar asientos automático    │
│    al liquidar nómina           │
│                                 │
│ [Guardar configuración]         │
└─────────────────────────────────┘
```

**Panel de historial de sincronizaciones:**
- Últimos envíos con status (✅/❌)
- Botón "Sincronizar período" manual
- Link al comprobante en Siigo/Alegra

### 4. Hook Post-Liquidación

En el flujo de liquidación existente, si `auto_sync = true`:
- Invocar `accounting-sync` automáticamente
- Notificar al usuario del resultado

## Credenciales Seguras

Las credenciales de Siigo/Alegra se almacenarán como **Supabase Secrets** por empresa, accesibles solo desde la Edge Function. Nunca en texto plano en la base de datos.

## Orden de implementación

1. Migraciones: `accounting_integrations` + `accounting_sync_logs`
2. Edge Function `accounting-sync` con adaptadores Siigo/Alegra
3. UI wizard de conexión + historial
4. Hook post-liquidación para sync automático

