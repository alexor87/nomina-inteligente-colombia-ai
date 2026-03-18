# OpenSpec — Finppi Nómina

## ¿Para qué sirve esta carpeta?

Esta carpeta contiene las **especificaciones técnicas** de cada cambio o nueva funcionalidad que desarrollamos en la plataforma.

La idea es simple: **antes de escribir una sola línea de código, se escribe la spec.** Así el PM puede revisar y aprobar qué se va a hacer, y yo (el equipo técnico) tengo una guía clara de qué construir.

Esto previene el problema que tuvimos antes: desarrollar sin dirección, crear versiones duplicadas de los mismos servicios, y acumular deuda técnica.

---

## ¿Cómo funciona?

### Flujo de trabajo

```
1. PM tiene una idea o necesidad
        ↓
2. CTO (Claude) crea una spec en openspec/proposals/
        ↓
3. PM revisa la spec y la aprueba
        ↓
4. CTO ejecuta el desarrollo
        ↓
5. Spec se mueve a openspec/completed/ como historial
```

### ¿Cuándo se usa OpenSpec?

**SÍ usar OpenSpec:**
- Nuevas funcionalidades
- Cambios de arquitectura
- Integraciones con servicios externos
- Cambios que afectan múltiples módulos

**NO se necesita OpenSpec:**
- Bug fixes simples y directos
- Cambios de texto o UI menores
- Actualizaciones de dependencias
- Fixes de seguridad del Sprint 1 (ya documentados en TECH_TRACKER.md)

---

## Estructura de una spec

Cada propuesta vive en su propia carpeta con la fecha y nombre del cambio:

```
openspec/
└── proposals/
    └── 2026-03-17-nombre-del-cambio/
        ├── spec.md      ← QUÉ se va a hacer y POR QUÉ
        ├── tasks.md     ← CÓMO: tareas técnicas desglosadas
        └── design.md    ← Decisiones de arquitectura (solo si aplica)
```

---

## Para el PM: ¿Qué revisar en una spec?

Cuando el CTO te presente una spec para aprobar, verifica:

1. **spec.md** — ¿El problema que describe es el correcto? ¿El objetivo tiene sentido para el negocio?
2. **tasks.md** — ¿Entiendes a grandes rasgos qué se va a tocar? ¿Hay algo que te preocupe?
3. Si algo no está claro, pide explicación antes de aprobar. Es mucho más fácil cambiar una spec que cambiar código ya escrito.

---

## Historial

Las specs de cambios ya implementados se archivan en `openspec/completed/` para referencia futura.

---

*Sistema adoptado: 17 de Marzo 2026*
*Decisión: Usar OpenSpec con Claude Code (sin Antigravity)*
