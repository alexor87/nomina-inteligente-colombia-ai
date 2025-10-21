# Normatividad Laboral Colombiana 2025

Este documento resume la normatividad vigente aplicable al sistema de nómina para el año 2025.

---

## 📋 Ley 2101 de 2021 - Reducción Progresiva de la Jornada Laboral

### Reducción de Jornada Máxima Legal

La Ley 2101 de 2021 estableció una reducción gradual de la jornada laboral máxima en Colombia:

| Fecha de Vigencia | Jornada Semanal | Jornada Mensual | Base Legal |
|-------------------|-----------------|-----------------|------------|
| **Hasta 14 julio 2023** | 48 horas | 240 horas | Art. 161 CST (original) |
| **15 julio 2023 - 14 julio 2024** | 47 horas | 235 horas | Ley 2101/2021 (1ra fase) |
| **15 julio 2024 - 14 julio 2025** | 46 horas | 230 horas | Ley 2101/2021 (2da fase) |
| **15 julio 2025 - 14 julio 2026** | 44 horas | 220 horas | Ley 2101/2021 (3ra fase) |
| **Desde 15 julio 2026** | 42 horas | 210 horas | Ley 2101/2021 (final) |

### Impacto en Cálculos de Nómina

**Valor de Hora Ordinaria:**
```
Hora Ordinaria = Salario Mensual / Horas Mensuales Legales
```

**Divisores de Nómina 2025:**
- **Hasta 14 julio 2025:** 230 horas/mes
- **Desde 15 julio 2025:** 220 horas/mes

---

## 📊 Ley 2466 de 2025 - Recargo Dominical y Festivo Progresivo

### Aumento del Recargo Dominical y Festivo

La Ley 2466 de 2025 estableció un aumento progresivo del recargo por trabajo en dominicales y festivos:

| Fecha de Vigencia | Recargo Dominical/Festivo | Incremento vs. Anterior |
|-------------------|---------------------------|-------------------------|
| **Hasta 30 junio 2025** | 75% | - (Art. 179 CST original) |
| **1 julio 2025 - 30 junio 2026** | **80%** | +5 puntos |
| **1 julio 2026 - 30 junio 2027** | **90%** | +10 puntos |
| **Desde 1 julio 2027** | **100%** | +25 puntos (total) |

### Impacto en Horas Extra Dominicales y Festivas

**Hora Extra Dominical Diurna:**
```
Factor = 1.25 (extra diurna) + Recargo Dominical vigente
```

| Período | Factor Total |
|---------|--------------|
| Hasta 30 jun 2025 | 2.00 (1.25 + 0.75) |
| 1 jul 2025 - 30 jun 2026 | **2.05** (1.25 + 0.80) |
| 1 jul 2026 - 30 jun 2027 | **2.15** (1.25 + 0.90) |
| Desde 1 jul 2027 | **2.25** (1.25 + 1.00) |

**Hora Extra Dominical Nocturna:**
```
Factor = 1.75 (extra nocturna) + Recargo Dominical vigente
```

| Período | Factor Total |
|---------|--------------|
| Hasta 30 jun 2025 | 2.50 (1.75 + 0.75) |
| 1 jul 2025 - 30 jun 2026 | **2.55** (1.75 + 0.80) |
| 1 jul 2026 - 30 jun 2027 | **2.65** (1.75 + 0.90) |
| Desde 1 jul 2027 | **2.75** (1.75 + 1.00) |

---

## ⏰ Artículo 168 CST - Recargos por Horas Extra

### Recargos Vigentes (sin cambios en 2025)

| Tipo de Hora Extra | Factor | Porcentaje Adicional | Base Legal |
|-------------------|--------|---------------------|------------|
| **Extra Diurna** | 1.25 | 25% | Art. 168 CST |
| **Extra Nocturna** | 1.75 | 75% | Art. 168 CST |
| **Recargo Nocturno** | 1.35 | 35% | Art. 168 CST |

### Jornadas Laborales

| Jornada | Horario |
|---------|---------|
| **Diurna** | 6:00 AM - 10:00 PM |
| **Nocturna** | 10:00 PM - 6:00 AM |

---

## 💰 Valores Legales 2025

### Salario Mínimo y Auxilio de Transporte

| Concepto | Valor 2025 | Base Legal |
|----------|-----------|------------|
| **Salario Mínimo Legal Mensual (SMMLV)** | $1,423,500 | Decreto 2613/2024 |
| **Auxilio de Transporte** | $200,000 | Decreto 2613/2024 |

### Límite para Auxilio de Transporte

Los trabajadores que devenguen hasta **2 SMMLV** ($2,847,000) tienen derecho al auxilio de transporte.

### Unidad de Valor Tributario (UVT)

| Concepto | Valor 2025 |
|----------|-----------|
| **UVT** | $49,799 | DIAN |

---

## 🔍 Referencias Legales

- **Código Sustantivo del Trabajo (CST)** - Ley Laboral Colombiana
- **Ley 2101 de 2021** - Reducción progresiva de jornada laboral
- **Ley 2466 de 2025** - Aumento progresivo recargo dominical y festivo
- **Decreto 2613 de 2024** - Salario mínimo y auxilio de transporte 2025
- **Artículo 161 CST** - Jornada ordinaria
- **Artículo 168 CST** - Tasas de recargos por trabajo extra
- **Artículo 179 CST** - Trabajo dominical y festivo

---

## ⚙️ Implementación en el Sistema

### Backend (Edge Functions)

Todos los cálculos de nómina se realizan en el backend (`supabase/functions/payroll-calculations`) utilizando:

- `getJornadaLegalHoras(fecha)` - Determina horas mensuales según fecha
- `getRecargoDominicalFestivo(fecha)` - Aplica factor progresivo de Ley 2466/2025
- `calcularHorasExtra()` - Aplica factores correctos según tipo y fecha
- `calcularRecargos()` - Calcula recargos nocturnos y dominicales

### Frontend (Constantes Informativas)

Las constantes en el frontend (`src/constants/index.ts` y `src/types/novedades-enhanced.ts`) son **informativas** y reflejan valores históricos. Los cálculos reales siempre se realizan en el backend con los valores vigentes según la fecha.

#### Funciones Auxiliares Frontend:

```typescript
// src/constants/index.ts
getRecargoDominicalVigente(fecha: Date): number

// src/types/novedades-enhanced.ts
getHorasExtraFactorVigente(subtipo: string, fecha: Date): number
```

---

**Última actualización:** Octubre 2025  
**Sistema:** Nómina Empresarial Colombiana  
**Versión Normativa:** 2025
