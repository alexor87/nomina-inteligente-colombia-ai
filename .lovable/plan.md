
# Plan: Agregar Cuentas PUC Personalizadas

## Cambios Necesarios

### 1. Service - `AccountingMappingService.ts`
Agregar métodos:
- `createMapping(concept, puc_account, puc_description, entry_type)` - crear cuenta personalizada
- `deleteMapping(id)` - eliminar solo cuentas personalizadas
- Agregar campo `is_custom` en la interface para diferenciar estándar vs personalizado

### 2. UI - `PUCMappingEditor.tsx`
- Botón "+ Agregar Cuenta" que abre un Dialog
- Formulario con: Nombre del concepto, Cuenta PUC, Descripción, Tipo (Débito/Crédito)
- Validación de cuenta PUC duplicada
- Icono de eliminar solo en filas personalizadas (las estándar no se pueden borrar)
- Badge visual "Personalizado" para distinguir cuentas custom

### 3. Base de Datos
La tabla ya soporta conceptos personalizados (campo `concept` es texto libre). Solo necesitamos distinguir cuáles son estándar verificando si existen en `conceptLabels`.

## Flujo de Usuario
1. Click en "Agregar Cuenta"
2. Llenar formulario con validación en tiempo real
3. Guardar → aparece en la tabla correspondiente (débito/crédito)
4. Puede editar o eliminar sus cuentas personalizadas
5. Las cuentas estándar del PUC colombiano no se pueden eliminar
