-- Actualizar summaries en legal_knowledge_base para reflejar recargo dominical progresivo correcto

-- Documento 1: Recargos y horas extras (id original del query)
UPDATE legal_knowledge_base
SET summary = 'Recargos básicos: extra diurna +25%, extra nocturna +75%, nocturno ordinario +35%. Recargo dominical/festivo PROGRESIVO (Ley 2466/2025): hasta jun 2025: 75%, jul 2025-jun 2026: 80%, jul 2026-jun 2027: 90%, desde jul 2027: 100%. Combinaciones acumulativas según jurisprudencia.'
WHERE title ILIKE '%Recargos y horas extras%' AND content ILIKE '%Art. 168%';

-- Documento 2: Jurisprudencia
UPDATE legal_knowledge_base
SET summary = 'Combinaciones de recargos se acumulan (CSJ 2020-2024). Salario integral: 30% compensa prestaciones excepto vacaciones. Pagos no constitutivos: viáticos ocasionales, bonificaciones no habituales. Recargo dominical/festivo PROGRESIVO: 75% pre-jul 2025, 80% vigente jul 2025-jun 2026, 90% jul 2026-jun 2027, 100% desde jul 2027.'
WHERE title ILIKE '%Jurisprudencia%' AND content ILIKE '%Corte Suprema%';

-- Documento 3: Snippets operativos
UPDATE legal_knowledge_base
SET summary = 'Funciones técnicas RAG: valor_hora(salario, fecha) con divisor según Ley 2101 (220h para 2025). calcular_recargo() con factores progresivos para dominical (80% actual oct 2025). liquidacion_incapacidad() y prorrata_prestaciones(). Validación: evitar doble conteo en combinaciones.'
WHERE title ILIKE '%Snippets operativos%';

-- Insertar documento específico sobre Ley 2466/2025 si no existe
INSERT INTO legal_knowledge_base (
  title, 
  reference, 
  topic, 
  document_type, 
  temporal_validity,
  summary,
  content,
  keywords,
  sources,
  examples
)
SELECT 
  'Ley 2466 de 2025 - Incremento progresivo recargo dominical/festivo',
  'Ley 2466 de 2025',
  'recargos_dominicales',
  'ley',
  '2025-01-15',
  'Recargo dominical/festivo aumenta progresivamente: 75% hasta jun 2025, 80% jul 2025-jun 2026 (VIGENTE), 90% jul 2026-jun 2027, 100% desde jul 2027. Aplica a trabajo en domingos y festivos según Art. 179 CST.',
  E'La Ley 2466 de 2025 establece el incremento progresivo del recargo por trabajo en domingos y días festivos:\n\n**CRONOGRAMA DE IMPLEMENTACIÓN:**\n- Hasta 30 de junio de 2025: +75% (factor 1.75)\n- 1 de julio de 2025 a 30 de junio de 2026: +80% (factor 1.80) ← VIGENTE ACTUALMENTE\n- 1 de julio de 2026 a 30 de junio de 2027: +90% (factor 1.90)\n- Desde 1 de julio de 2027: +100% (factor 2.00)\n\n**BASE LEGAL:**\n- Art. 179 CST (modificado por Ley 2466/2025)\n- Aplica a trabajo ordinario y extraordinario en domingos y festivos\n- Se acumula con otros recargos (nocturno, horas extras) según jurisprudencia\n\n**CÁLCULO:**\n- Valor hora dominical = Valor hora ordinaria × (1 + recargo vigente)\n- Ejemplo oct 2025: Hora ordinaria × 1.80 = Hora dominical\n\n**COMBINACIONES:**\n- Hora extra diurna dominical: 1.25 (extra) + 0.80 (dominical) = factor 2.05\n- Hora extra nocturna dominical: 1.75 (extra nocturna) + 0.80 (dominical) = factor 2.55\n\n**IMPORTANTE:** El sistema debe calcular el recargo vigente según la fecha de la nómina.',
  ARRAY['recargo_dominical', 'festivo', 'ley_2466', 'progresivo', 'art_179', 'domingo']::text[],
  ARRAY['Ley 2466 de 2025', 'Art. 179 CST modificado', 'Ministerio de Trabajo - Concepto 2025-01']::text[],
  ARRAY[
    'Salario $1.800.000, trabajo 8h domingo oct 2025: Hora ordinaria = $1.800.000/220 = $8.182. Hora dominical = $8.182 × 1.80 = $14.727 por hora. Total 8h = $117.818',
    'Hora extra nocturna dominical oct 2025: factor 2.55 (1.75 extra nocturna + 0.80 dominical progresivo)'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM legal_knowledge_base 
  WHERE reference = 'Ley 2466 de 2025'
);