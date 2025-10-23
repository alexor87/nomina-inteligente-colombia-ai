-- Corrección 1: Actualizar documento con errores de horario y recargos
UPDATE legal_knowledge_base
SET 
  content = 'Recargos y horas extras: porcentajes, combinaciones y ejemplos prácticos

HORARIOS LEGALES (Art. 168 CST):
- Jornada diurna: 6:00 AM - 10:00 PM
- Jornada nocturna: 10:00 PM - 6:00 AM

RECARGOS BASE (Art. 168 CST - SIN CAMBIOS):
1) Hora extra diurna (6am-10pm): +25% (factor 1.25)
2) Hora extra nocturna (10pm-6am): +75% (factor 1.75)
3) Recargo nocturno ordinario (10pm-6am, sin exceder jornada): +35% (factor 1.35)

RECARGOS DOMINICALES/FESTIVOS (Art. 179 CST + Ley 2466/2025):
IMPORTANTE: La Ley 2466 de 2025 establece aumento progresivo:

Hasta 30 junio 2025: +75% (factor 1.75)
1 julio 2025 - 30 junio 2026: +80% (factor 1.80) ← VIGENTE AHORA
1 julio 2026 - 30 junio 2027: +90% (factor 1.90)
Desde 1 julio 2027: +100% (factor 2.00)

COMBINACIONES (jurisprudencia - los recargos se suman):

5) Hora extra dominical/festiva diurna (6am-10pm en domingo/festivo):
   - Hasta 30 jun 2025: factor 2.00 (1.25 extra + 0.75 dominical)
   - 1 jul 2025 - 30 jun 2026: factor 2.05 (1.25 + 0.80)
   - 1 jul 2026 - 30 jun 2027: factor 2.15 (1.25 + 0.90)
   - Desde 1 jul 2027: factor 2.25 (1.25 + 1.00)

6) Hora extra dominical/festiva nocturna (10pm-6am en domingo/festivo):
   - Hasta 30 jun 2025: factor 2.50 (1.75 extra nocturna + 0.75 dominical)
   - 1 jul 2025 - 30 jun 2026: factor 2.55 (1.75 + 0.80)
   - 1 jul 2026 - 30 jun 2027: factor 2.65 (1.75 + 0.90)
   - Desde 1 jul 2027: factor 2.75 (1.75 + 1.00)

LÍMITES LEGALES:
- Máximo 2 horas extras diarias
- Máximo 12 horas extras semanales

EJEMPLO PRÁCTICO (2025):
Salario: $1.800.000, jornada 44h/sem (220h/mes desde jul 2025)
Valor hora ordinaria = $1.800.000 / 220 = $8.181,82

Cálculos para julio-dic 2025 (recargo dominical 80%):
- 1 hora extra diurna festiva = $8.181,82 × 2.05 = $16.772,73
- 1 hora extra nocturna festiva = $8.181,82 × 2.55 = $20.863,64
- 1 hora recargo nocturno ordinario = $8.181,82 × 1.35 = $11.045,46',
  keywords = ARRAY['recargo nocturno', 'horas extras', 'jornada nocturna', 'recargo dominical', 'recargo festivo', 'ley 2466', 'combinaciones'],
  updated_at = now()
WHERE id = 'df30ab72-ce0a-48cc-a440-9b83f4dab983';

-- Corrección 2: Crear nuevo documento sobre Ley 2466/2025
INSERT INTO legal_knowledge_base (
  title,
  content,
  document_type,
  year,
  reference,
  topic,
  keywords,
  summary
) VALUES (
  'Ley 2466 de 2025 - Aumento progresivo recargo dominical y festivo',
  'La Ley 2466 de 2025 modifica el artículo 179 del Código Sustantivo del Trabajo (CST) estableciendo un incremento gradual del recargo por trabajo en días dominicales y festivos:

VIGENCIA Y PORCENTAJES:
- Hasta 30 junio 2025: 75% adicional sobre salario ordinario (Art. 179 CST original)
- 1 julio 2025 - 30 junio 2026: 80% adicional (incremento de 5 puntos)
- 1 julio 2026 - 30 junio 2027: 90% adicional (incremento de 10 puntos)
- Desde 1 julio 2027 en adelante: 100% adicional (incremento de 25 puntos totales)

IMPACTO EN HORAS EXTRAS DOMINICALES:

Cuando se combina trabajo dominical/festivo con horas extras, los recargos se suman según jurisprudencia de la Corte Suprema:

Hora extra diurna dominical/festiva:
- Hasta 30 jun 2025: 25% (extra) + 75% (dominical) = 100% adicional (factor 2.00)
- 1 jul 2025 - 30 jun 2026: 25% + 80% = 105% adicional (factor 2.05)
- 1 jul 2026 - 30 jun 2027: 25% + 90% = 115% adicional (factor 2.15)
- Desde 1 jul 2027: 25% + 100% = 125% adicional (factor 2.25)

Hora extra nocturna dominical/festiva:
- Hasta 30 jun 2025: 75% (extra nocturna) + 75% (dominical) = 150% adicional (factor 2.50)
- 1 jul 2025 - 30 jun 2026: 75% + 80% = 155% adicional (factor 2.55)
- 1 jul 2026 - 30 jun 2027: 75% + 90% = 165% adicional (factor 2.65)
- Desde 1 jul 2027: 75% + 100% = 175% adicional (factor 2.75)

NOTA IMPORTANTE: Esta ley NO afecta:
- Recargo nocturno ordinario (sigue siendo 35% según Art. 168 CST)
- Hora extra diurna ordinaria (sigue siendo 25%)
- Hora extra nocturna ordinaria (sigue siendo 75%)

SOLO afecta el recargo aplicable por trabajo en domingos y festivos (Art. 179 CST).

OBJETIVO DE LA LEY: Mejorar la compensación de trabajadores que laboran en días de descanso obligatorio, reconociendo el sacrificio familiar y personal que implica trabajar en domingos y festivos.

APLICABILIDAD: Todos los sectores económicos, sin excepción. Empleadores deben ajustar sus sistemas de nómina para aplicar el recargo correcto según la fecha de devengo.',
  'ley',
  2025,
  'Ley 2466/2025',
  'recargo_dominical_festivo',
  ARRAY['recargo dominical', 'recargo festivo', 'ley 2466', 'aumento progresivo', 'trabajo dominical', '100%', 'art 179', 'reforma laboral'],
  'Incremento gradual del recargo por trabajo dominical/festivo del 75% al 100% entre 2025-2027'
);