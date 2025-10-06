-- Fase 2: Insertar RAG completo de legislación laboral colombiana
-- Fecha: 2025-10-06

-- Limpiar documentos existentes (opcional, comentado por seguridad)
-- DELETE FROM public.legal_knowledge_base;

-- Insertar los 16 documentos del RAG completo
INSERT INTO public.legal_knowledge_base 
(title, content, document_type, reference, year, topic, keywords, metadata, summary, sources, examples, embedding_hint, note, temporal_validity)
VALUES

-- Documento 1: META-000
(
  'RAG: Nómina Colombia - Metadatos',
  'RAG completo de legislación laboral y reglas de nómina en Colombia, actualizado a 2025-10-06. Diseñado para indexación en motores vectoriales (Pinecone, Weaviate, Supabase Vector). Incluye referencias, ejemplos y metadatos para mantenimiento temporal.',
  'meta',
  'META-000',
  2025,
  'metadatos',
  ARRAY['meta', 'versioning', 'mantenimiento', 'rag'],
  '{"id": "META-000"}'::jsonb,
  'RAG completo de legislación laboral y reglas de nómina en Colombia, actualizado a 2025-10-06. Diseñado para indexación en motores vectoriales (Pinecone, Weaviate, Supabase Vector). Incluye referencias, ejemplos y metadatos para mantenimiento temporal.',
  ARRAY['Código Sustantivo del Trabajo (CST)', 'Decreto 1072 de 2015 (Decreto Único Reglamentario - Sector Trabajo)', 'Ley 2101 de 2021', 'Decretos y conceptos oficiales del Ministerio de Trabajo y Ministerio de Salud'],
  ARRAY['Usar como contexto para respuestas legales operativas sobre horas extras, incapacidades, prestaciones y aportes', 'Indexar por title y tags para recuperar fácilmente bloques normativos'],
  'documento meta: fecha de vigencia, fuentes y formato',
  NULL,
  '2025-10-06'::date
),

-- Documento 2: RAG-L001
(
  'Marco legal general del derecho laboral colombiano (visión consolidada 2025)',
  'Normas marco que regulan las relaciones laborales: Código Sustantivo del Trabajo (CST), Ley 50/1990, Ley 100/1993, Ley 2101/2021 (reducción progresiva de jornada), Decreto 1072/2015 (Decreto Único Reglamentario del Sector Trabajo). Autoridades: Ministerio de Trabajo, UGPP, Ministerio de Salud, ARL, EPS. El CST establece los derechos y obligaciones fundamentales de empleadores y trabajadores, incluyendo jornada laboral, salario mínimo, prestaciones sociales, seguridad social y terminación de contratos.',
  'ley',
  'Código Sustantivo del Trabajo (Decreto 2663 de 1950)',
  2025,
  'marco_legal',
  ARRAY['general', 'normativa', 'autoridades', 'cst', 'ley'],
  '{"id": "RAG-L001"}'::jsonb,
  'Normas marco que regulan las relaciones laborales: Código Sustantivo del Trabajo (CST), Ley 50/1990, Ley 100/1993, Ley 2101/2021 (reducción progresiva de jornada), Decreto 1072/2015 (Decreto Único Reglamentario del Sector Trabajo). Autoridades: Ministerio de Trabajo, UGPP, Ministerio de Salud, ARL, EPS.',
  ARRAY['Código Sustantivo del Trabajo (Decreto 2663 de 1950)', 'Ley 2101 de 2021', 'Decreto 1072 de 2015 (actualizado en 2025 por DUR del Sector Trabajo)'],
  ARRAY['¿Qué norma establece límites de jornada y su reciente reducción?', '¿Qué entidades vigilan aportes y seguridad social?'],
  'marco legal consolidado y autoridades competentes',
  NULL,
  '2025-10-06'::date
),

-- Documento 3: RAG-FIN001
(
  'Salario mínimo y auxilio de transporte - valores vigentes 2025',
  'Valor del Salario Mínimo Mensual Legal Vigente (SMMLV) para 2025: $1.423.500. Auxilio de Transporte 2025: $200.000 (aplica para trabajadores que devenguen hasta 2 SMMLV). Total SMMLV + AT = $1.623.500. El auxilio de transporte NO constituye salario para efectos de prestaciones sociales ni aportes a seguridad social. Conversiones: Salario diario = SMMLV / 30 = $47.450. Valor hora ordinaria (jornada 240h/mes tradicional) = $5.931,25. Con reducción a 44h semanales (220h/mes) = $6.470,45 por hora.',
  'concepto',
  'Decreto Presidencial y comunicados del Ministerio de Trabajo sobre salario mínimo 2025',
  2025,
  'salario_minimo',
  ARRAY['financiero', 'salario', 'auxilio-transporte', 'smmlv', '2025'],
  '{"id": "RAG-FIN001", "smmlv_2025": 1423500, "auxilio_transporte_2025": 200000}'::jsonb,
  'Valor del Salario Mínimo Mensual Legal Vigente (SMMLV) y Auxilio de Transporte para 2025, y equivalencias diarias/horarias para cálculos de nómina. Datos oficiales y su uso para liquidaciones, topes y bases de cotización.',
  ARRAY['Decreto Presidencial y comunicados del Ministerio de Trabajo sobre salario mínimo 2025', 'Análisis legales y económicos de 2024-12 que fijaron SMMLV 2025'],
  ARRAY['Usar SMMLV 2025 = $1.423.500 para calcular base de cotización', 'Auxilio de transporte 2025 = $200.000 (no afecta prestaciones si corresponde según ley)'],
  'valor smmlv 2025, valor auxilio transporte 2025, conversiones hora/dia',
  'SMMLV 2025 = $1,423,500; Auxilio de Transporte 2025 = $200,000; total SMLV+AT = $1,623,500. Fuente oficial y prensa especializada.',
  '2025-10-06'::date
),

-- Documento 4: RAG-J001
(
  'Jornada laboral y reducción progresiva (Ley 2101/2021) - estado a oct-2025',
  'La Ley 2101/2021 dispuso reducción progresiva de la jornada ordinaria hacia 42 h/sem. Cronograma de implementación: Hasta junio 30, 2023: 48 horas semanales (240h mensuales). Julio 1, 2023 - junio 30, 2024: 47 horas semanales (235h mensuales). Julio 1, 2024 - junio 30, 2025: 46 horas semanales (230h mensuales). Desde julio 15, 2025: 44 horas semanales (220h mensuales). Meta final (2026): 42 horas semanales (210h mensuales). Esta reducción NO implica disminución salarial (salarios se mantienen salvo pacto contrario permitido por la norma). Impacto en cálculo de valor hora: debe usarse el divisor correcto según la fecha (ej: salario / 220 para períodos desde julio 2025).',
  'ley',
  'Ley 2101 de 2021',
  2025,
  'jornada_laboral',
  ARRAY['jornada', 'ley-2101', 'implementacion', 'reduccion', '44-horas', '42-horas'],
  '{"id": "RAG-J001", "jornada_actual_2025": 44, "horas_mensuales_2025": 220}'::jsonb,
  'La Ley 2101/2021 dispuso reducción progresiva de la jornada ordinaria hacia 42 h/sem. El cronograma de implementación ha ido disminuyendo gradualmente el tope semanal; en la senda prevista para 2025 la jornada pasó a 44 horas (a partir del 15 de julio de 2025) y continuará la reducción hasta 42 h según lo dispuesto por la ley y su reglamentación.',
  ARRAY['Ley 2101 de 2021 (artículos modificatorios al CST sobre jornada máxima)', 'Actualizaciones y guías de implementación publicadas por el Ministerio de Trabajo'],
  ARRAY['Calcular nuevas bases horarias: valor hora = salario mensual / (número de horas mensuales aplicable tras la reducción)', '¿Cómo afecta a la liquidación de horas extras el tránsito de 46->44->42 horas?'],
  'reduccion progresiva jornada 2025 44 horas 2026 42 horas',
  'Implementación progresiva: cronograma y pasos hasta 42 h/sem (ver Ley 2101 y publicaciones de 2025).',
  '2025-10-06'::date
),

-- Documento 5: RAG-C001
(
  'Tipos de contrato, requisitos formales y contratos por días',
  'Resumen de modalidades contractuales: 1) Contrato a término indefinido: sin fecha de terminación definida, mayor estabilidad. 2) Contrato a término fijo: duración determinada (mínimo 1 año primera vez, renovaciones mínimo 1 año salvo pacto). 3) Contrato por obra o labor: termina al completarse la tarea específica. 4) Contrato por días: trabajadores que laboran menos de la jornada completa semanal, con cotización proporcional. 5) Contrato de aprendizaje: formación práctica, cuota de aprendices según tamaño empresa. Requisitos formales: identificación de partes, objeto (funciones), lugar de trabajo, jornada, salario, período de prueba (máximo 2 meses). Contrato por días: obligaciones de cotización proporcional a días trabajados; registros y facturación para PILA.',
  'concepto',
  'CST Art. 45-61',
  2025,
  'contratos',
  ARRAY['contratos', 'formalidades', 'contrato-por-dias', 'tipos', 'termino-fijo', 'indefinido'],
  '{"id": "RAG-C001"}'::jsonb,
  'Resumen de modalidades contractuales (término fijo, indefinido, obra o labor, por días, aprendices) y formalidades: objeto, jornada, salario, período de prueba. Contrato por días: obligaciones de cotización proporcional; registros y facturación para la PILA.',
  ARRAY['CST Art. 45-61', 'Decretos y conceptos del Ministerio de Trabajo relativos a contratación por días'],
  ARRAY['¿Cuándo es válido un contrato a término fijo y plazos máximos?', 'Cómo registrar un trabajador por días en PILA y base de cotización'],
  'contratos laborales y condiciones formales',
  NULL,
  '2025-10-06'::date
),

-- Documento 6: RAG-H001
(
  'Hora ordinaria: cálculo y reglas prácticas (incluye efecto de reducción de jornada)',
  'Regla práctica para jornada completa: tradicionalmente valor hora = salario mensual / 240; sin embargo, si la jornada semanal aplicable cambia (por reducción progresiva), la base horaria debe recalcularse. Con Ley 2101/2021: Para períodos desde julio 15, 2025: valor hora = salario mensual / 220 (44h semanales × 5 semanas). Para períodos desde 2026: valor hora = salario mensual / 210 (42h semanales × 5 semanas). Para salarios variables (comisiones): promediar últimos 3-6 meses de ingresos para efectos de prestaciones y recargos. Ejemplo: Salario $1.800.000 con jornada 44h/sem: Valor hora = 1.800.000 / 220 = $8.181,82.',
  'concepto',
  'CST Art. 159-168',
  2025,
  'calculo_hora',
  ARRAY['calculo-hora', 'practico', 'reduccion-jornada', 'valor-hora', 'divisor'],
  '{"id": "RAG-H001", "divisor_2025": 220, "divisor_2026": 210}'::jsonb,
  'Regla práctica para jornada completa: tradicionalmente valor hora = salario mensual / 240; sin embargo, si la jornada semanal aplicable cambia (por reducción progresiva), la base horaria debe recalcularse tomando en cuenta el número de horas mensuales vigente.',
  ARRAY['CST Art. 159-168 (base legal horas extras y valor hora)', 'Guías de liquidación del Ministerio de Trabajo y firmas especializadas (práctica 2025)'],
  ARRAY['Cálculo hora ordinaria para salario 1.800.000 con jornada 44 h/sem: explicación paso a paso', 'Cómo promediar comisiones de tres meses para la base de horas extras'],
  'salario/240 vs. ajuste por jornada 44h o 42h',
  NULL,
  '2025-10-06'::date
),

-- Documento 7: RAG-R001
(
  'Recargos y horas extras: porcentajes, combinaciones y ejemplos prácticos',
  'Reglas de recargos y horas extras (CST Art. 168, 179): 1) Hora extra diurna (6am-9pm): +25% sobre hora ordinaria (factor 1.25). 2) Hora extra nocturna (9pm-6am): +75% sobre hora ordinaria (factor 1.75). 3) Recargo nocturno ordinario (9pm-6am, sin exceder jornada): +35% sobre hora ordinaria (factor 1.35). 4) Trabajo dominical/festivo ordinario: +75% sobre hora ordinaria (factor 1.75). 5) Hora extra dominical/festiva diurna: +100% (factor 2.0). 6) Hora extra dominical/festiva nocturna: +150% (factor 2.5). Combinaciones: Los recargos se suman según jurisprudencia. Ejemplo: 1 hora extra nocturna en festivo = hora ordinaria × 2.5. Límites legales: máximo 2 horas extras diarias, 12 semanales. Ejemplo numérico: Salario $1.800.000, jornada 44h/sem → Valor hora = $8.181,82. 1 hora extra nocturna festiva = $8.181,82 × 2.5 = $20.454,55.',
  'concepto',
  'CST Art. 168, Art. 179',
  2025,
  'recargos_horas_extras',
  ARRAY['recargos', 'horas-extras', 'combinaciones', 'porcentajes', 'nocturno', 'festivo', 'dominical'],
  '{"id": "RAG-R001", "factores": {"diurna": 1.25, "nocturna": 1.75, "recargo_nocturno": 1.35, "dominical": 1.75, "extra_dominical_diurna": 2.0, "extra_dominical_nocturna": 2.5}}'::jsonb,
  'Reglas de recargos: recargo nocturno (35% sobre hora diurna), horas extras diurnas +25%, horas extras nocturnas +75%, trabajo dominical/festivo +75%; combinaciones (nocturno+festivo+extra) deben sumarse conforme a la fórmula jurídica aceptada y jurisprudencia sobre acumulación de recargos.',
  ARRAY['CST Art. 168, Art. 179', 'Decreto 1072 de 2015 (sector trabajo) y análisis jurídicos 2024-2025 sobre recargos'],
  ARRAY['Calcular: 1 hora extra nocturna en festivo (paso a paso)', 'Cómo tratar recargos cuando el empleado tiene salario integral'],
  'tabla porcentajes: +25% +75% +35% +75% y combinaciones jurisprudenciales',
  'Recomendado: mantener una función de combinador de recargos en el motor RAG que implemente la suma/multiplicación correcta para evitar errores en doble conteo.',
  '2025-10-06'::date
),

-- Documento 8: RAG-I001
(
  'Incapacidades: procedimiento de pago y porcentajes (estado 2025)',
  'Incapacidades por enfermedad común: Empleador cubre los primeros 2 días al 100% del salario. La EPS paga desde el día 3 en adelante: Días 3-90: 66.67% del Ingreso Base de Cotización (IBC). Días 91-180: puede variar según EPS y tipo de enfermedad. Hasta 180 días continuos según modalidades. Incapacidades por accidente de trabajo o enfermedad laboral: La ARL paga desde el día 1 al 100% del IBC. No hay período a cargo del empleador. Base de cálculo: IBC del mes anterior a la incapacidad. Procedimiento: Trabajador presenta certificado médico. Empleador reporta en PILA. EPS/ARL procesan y pagan directamente o reembolsan al empleador.',
  'concepto',
  'CST Art. 227',
  2025,
  'incapacidades',
  ARRAY['incapacidades', 'eps', 'arl', 'pago', 'enfermedad', 'accidente'],
  '{"id": "RAG-I001", "dias_empleador": 2, "porcentaje_eps_dias_3_90": 66.67, "porcentaje_arl": 100}'::jsonb,
  'Incapacidades por enfermedad común: empleador cubre los primeros 2 días; la EPS paga desde el día 3 con porcentajes que pueden variar según los tramos. Incapacidades por accidente de trabajo son atendidas y pagadas por la ARL conforme a normas vigentes.',
  ARRAY['CST Art. 227', 'Conceptos del Ministerio de Salud y MinTrabajo sobre pago de incapacidades'],
  ARRAY['Empleado con incapacidad de 4 días: desglose día 1-2 (empleador) y día 3-4 (EPS) con cálculo base salario', 'Incapacidad de origen laboral: ARL paga desde el día correspondiente según normativa'],
  'incapacidades primeros dias empleador, porcentajes EPS tramos',
  'Confirmación doctrinal y administrativa sobre los dos primeros días como responsabilidad del empleador.',
  '2025-10-06'::date
),

-- Documento 9: RAG-P001
(
  'Prestaciones sociales: cesantías, intereses, prima y dotación',
  'Reglas y fórmulas: 1) Cesantías: 1 mes de salario por cada año trabajado (30 días × salario mensual / 360). Se pagan al finalizar contrato o se consignan antes del 15 de febrero. Base: salario + promedio de variables (comisiones, bonificaciones constitutivas). 2) Intereses a cesantías: 12% anual sobre saldo acumulado, se pagan antes del 31 de enero. Fórmula: (saldo cesantías × días trabajados × 0.12) / 360. 3) Prima de servicios: 15 días por semestre (medio mes por semestre completo). Se paga en junio y diciembre. Fórmula: (salario × días trabajados) / 360. 4) Vacaciones: 15 días hábiles por año. Se pagan al disfrutarlas o al finalizar contrato. 5) Dotación: 3 veces al año (enero, mayo, septiembre) para trabajadores que devenguen hasta 2 SMMLV.',
  'concepto',
  'CST Art. 249, Art. 306',
  2025,
  'prestaciones_sociales',
  ARRAY['prestaciones', 'cesantias', 'prima', 'intereses', 'vacaciones', 'dotacion'],
  '{"id": "RAG-P001", "tasa_interes_cesantias": 0.12}'::jsonb,
  'Reglas y fórmulas: cesantías = 1 mes por año (prorrateo por tiempo trabajado), intereses a cesantías = 12% anual sobre el saldo, prima = 15 días por semestre (prorrateo si no completa periodo), dotación según reglas vigentes.',
  ARRAY['CST Art. 249, Art. 306 y normativa conexa', 'Jurisprudencia pertinente en 2024-2025'],
  ARRAY['Cálculo cesantías para 7 meses trabajados con salario variable', 'Pago de intereses a cesantías: fórmula y fecha máxima'],
  'formulas de prestaciones y prorrata',
  NULL,
  '2025-10-06'::date
),

-- Documento 10: RAG-A001
(
  'Aportes a seguridad social y parafiscales (valores y porcentajes 2025)',
  'Porcentajes básicos 2025: 1) SALUD: Total 12.5% del IBC. Trabajador aporta 4%, empleador aporta 8.5%. 2) PENSIÓN: Total 16% del IBC. Trabajador aporta 4%, empleador aporta 12%. 3) FONDO DE SOLIDARIDAD PENSIONAL: Para salarios superiores a 4 SMMLV, aplica porcentaje adicional progresivo (1% a 2% según tramos). 4) ARL: Según clase de riesgo (I a V): Riesgo I: 0.522%, Riesgo II: 1.044%, Riesgo III: 2.436%, Riesgo IV: 4.350%, Riesgo V: 6.960%. 100% a cargo del empleador. 5) PARAFISCALES (aplica a empleadores con más de cierta nómina): SENA: 2% del IBC, ICBF: 3% del IBC, Cajas de Compensación: 4% del IBC. Base de cotización (IBC): Entre 1 SMMLV y 25 SMMLV. Mínimo $1.423.500 (2025).',
  'concepto',
  'Ley 100 de 1993',
  2025,
  'aportes_seguridad_social',
  ARRAY['aportes', 'salud', 'pension', 'arl', 'parafiscales', 'sena', 'icbf', 'cajas'],
  '{"id": "RAG-A001", "salud_trabajador": 4, "salud_empleador": 8.5, "pension_trabajador": 4, "pension_empleador": 12, "sena": 2, "icbf": 3, "cajas": 4}'::jsonb,
  'Porcentajes básicos (2025): salud (total 12.5%), pensión (16% total), ARL según clase de riesgo (tarifas variables 0.522% a 6.96%), parafiscales: SENA 2%, ICBF 3%, Cajas de Compensación 4%. Incluir cómo se calculan sobre la base de cotización y tope legal si aplica.',
  ARRAY['Ley 100 de 1993, Decretos reglamentarios y guías prácticas 2025', 'Artículos y guías de firmas de nómina sobre cálculo de aportes 2025'],
  ARRAY['Cálculo Aportes: trabajador con salario SMMLV 2025 — desglose salud, pensión, ARL y parafiscales', 'Cómo reportar aportes de trabajadores por días o independientes'],
  'porcentajes 2025 salud/pension/parafiscales ARL variable',
  'Parafiscales 2025: SENA 2%, ICBF 3%, Cajas 4% (confirmado en guías 2025).',
  '2025-10-06'::date
),

-- Documento 11: RAG-T001
(
  'Retención en la fuente laboral y deducciones (procedimientos 1 y 2)',
  'Cómo aplicar retención en la fuente sobre salarios según Estatuto Tributario: Existen dos procedimientos (trabajador escoge uno). PROCEDIMIENTO 1: Se aplica tabla de retención sobre la base gravable (ingreso laboral menos deducciones permitidas). Deducciones: Aportes obligatorios a salud y pensión, pagos a medicina prepagada (tope 16 UVT mensuales), dependientes, intereses de vivienda, AFC (Ahorro Voluntario Pensional). PROCEDIMIENTO 2: Retención fija del 10% sin considerar deducciones (más simple). Base de retención: Ingresos laborales del mes - deducciones permitidas. UVT 2025: $49.799. Rangos exentos y tarifas progresivas según tabla oficial DIAN.',
  'concepto',
  'Estatuto Tributario Art. 383-388',
  2025,
  'retencion_fuente',
  ARRAY['tributario', 'retencion', 'deducciones', 'impuestos', 'procedimiento1', 'procedimiento2'],
  '{"id": "RAG-T001", "uvt_2025": 49799}'::jsonb,
  'Cómo aplicar el procedimiento 1 y 2 del Estatuto Tributario para retención en la fuente sobre salarios; deducciones permitidas (salud, pensión voluntaria, dependientes, AFC, rentas exentas). Ejemplos de cálculo y valores de referencia 2025.',
  ARRAY['Estatuto Tributario (Art. 383-388), Decretos reglamentarios y manuales prácticos 2024-2025'],
  ARRAY['Aplicación de procedimiento 1 en empleado con salario superior al umbral', 'Deducciones que reducen base de retención en nómina'],
  'retencion procedimiento1 procedimiento2 deducciones',
  NULL,
  '2025-10-06'::date
),

-- Documento 12: RAG-LIQ001
(
  'Liquidación final (terminación contrato) - conceptos obligatorios',
  'Conceptos que deben incluirse en liquidación final: 1) Salarios pendientes hasta último día trabajado. 2) Cesantías proporcionales (días trabajados × salario / 360). 3) Intereses sobre cesantías (12% anual proporcional). 4) Prima de servicios proporcional (días del semestre × salario / 360). 5) Vacaciones no disfrutadas (días acumulados × salario diario). 6) Indemnización por despido sin justa causa (si aplica): Contrato indefinido: 30 días de salario por primer año, 20 días por años siguientes. Contrato a término fijo: valor salarios faltantes hasta fin de contrato o renovación. Plazos de pago: Máximo al momento de terminación del contrato. Mora genera intereses moratorios y sanciones administrativas del Ministerio de Trabajo.',
  'concepto',
  'CST Art. 64, 65, 186, 249, 306',
  2025,
  'liquidacion_final',
  ARRAY['liquidacion-final', 'terminacion', 'indemnizacion', 'finiquito', 'despido'],
  '{"id": "RAG-LIQ001"}'::jsonb,
  'Conceptos que deben incluirse en la liquidación final: salarios pendientes, prestaciones proporcionales (cesantías, intereses, prima), vacaciones no disfrutadas, indemnizaciones si aplica. Normas sobre plazos y consecuencias del incumplimiento.',
  ARRAY['CST Art. 64, 65, 186, 249, 306, Leyes conexas'],
  ARRAY['Cálculo de liquidación final para despido sin justa causa en contrato a término indefinido con 5 años de antigüedad', 'Procedimiento para reclamar liquidación no pagada'],
  'liquidacion final conceptos y formulas',
  NULL,
  '2025-10-06'::date
),

-- Documento 13: RAG-ESPEC001
(
  'Casos especiales: teletrabajo, trabajo remoto, aprendices y tercerización',
  'Reglas específicas: 1) TELETRABAJO (Ley 1221/2008): Trabajador labora fuera de las instalaciones del empleador usando TIC. Empleador debe proveer herramientas o compensar costos (internet, energía). Derechos iguales a trabajadores presenciales. 2) TRABAJO REMOTO (Ley 2121/2021): Más flexible que teletrabajo, puede ejecutarse desde cualquier ubicación. Empleador define políticas de conexión y disponibilidad. 3) APRENDICES (Contrato de aprendizaje SENA): Cuota según tamaño de empresa. Apoyo de sostenimiento (no salario): 50% SMMLV primera fase, 75% SMMLV fase práctica. Afiliación a salud y ARL obligatoria. 4) TERCERIZACIÓN (Empresas de Servicios Temporales - EST): EST aporta trabajadores en misión. Responsabilidad solidaria en aportes. Trabajador tiene derecho a prestaciones de la EST.',
  'concepto',
  'Ley 1221 de 2008, Ley 2121 de 2021',
  2025,
  'casos_especiales',
  ARRAY['teletrabajo', 'aprendices', 'tercerizacion', 'remoto', 'est'],
  '{"id": "RAG-ESPEC001"}'::jsonb,
  'Reglas específicas para teletrabajo (Ley 1221/2008 y ajustes posteriores) y trabajo remoto (Ley 2121/2021), derechos y obligaciones del empleador en suministro de herramientas y costos. Aprendices y contratos de aprendizaje: cuotas y excepción en aportes en ciertos casos.',
  ARRAY['Ley 1221 de 2008, Ley 2121 de 2021 y decretos reglamentarios', 'Conceptos administrativos del Ministerio de Trabajo'],
  ARRAY['Derechos de teletrabajador en materia de costos de conexión', 'Tratamiento de prestaciones para aprendices'],
  'modalidades especiales y obligaciones',
  NULL,
  '2025-10-06'::date
),

-- Documento 14: RAG-JUR001
(
  'Jurisprudencia y conceptos administrativos relevantes (2020-2025)',
  'Resúmenes de sentencias y conceptos administrativos que impactan interpretación: 1) Combinación de recargos (Corte Suprema sentencias 2020-2024): Los recargos de horas extras, nocturnos, dominicales y festivos se acumulan y no se excluyen mutuamente. Ejemplo jurisprudencial: hora extra nocturna festiva = sumar todos los recargos aplicables. 2) Salario integral: Para salarios superiores a 10 SMMLV, el 30% del salario integral compensa prestaciones sociales y recargos (excepto vacaciones). 3) Pagos no constitutivos de salario: Viáticos ocasionales, bonificaciones no habituales, auxilio de transporte legal. 4) Conceptos Ministerio de Trabajo: Criterios sobre base salarial en pagos variables, interpretaciones sobre contratos por días, guías de implementación Ley 2101/2021.',
  'concepto',
  'Sentencias Corte Suprema de Justicia',
  2025,
  'jurisprudencia',
  ARRAY['jurisprudencia', 'conceptos-administrativos', 'corte-suprema', 'ministerio'],
  '{"id": "RAG-JUR001"}'::jsonb,
  'Resúmenes de sentencias y conceptos administrativos que impactan interpretación (p. ej. combinaciones de recargos, salario integral y su incidencia en prestaciones, criterios sobre pagos no salariales).',
  ARRAY['Sentencias Corte Suprema de Justicia (SL1366-2020 y otras)', 'conceptos Ministerio del Trabajo (2023-2025)'],
  ARRAY['Interpretación sobre acumulación de recargos nocturno + festivo por la Corte', 'Criterios administrativos para base salarial en pagos variables'],
  'sentencias clave y conceptos oficiales hasta 2025',
  NULL,
  '2025-10-06'::date
),

-- Documento 15: RAG-UTILS001
(
  'Snippets operativos (funciones que debe exponer el motor RAG)',
  'Recomendaciones técnicas y snippets lógicos para el motor RAG: 1) FUNCIÓN valor_hora(salario, fecha_calculo): Determinar divisor correcto según Ley 2101 (220h para 2025, 210h para 2026+). Retornar salario / divisor. 2) FUNCIÓN calcular_recargo(tipo_hora, cantidad_horas, es_extra, es_festivo, es_nocturno): Aplicar factor correcto según combinación. Ejemplo: extra + nocturno + festivo = factor 2.5. 3) FUNCIÓN liquidacion_incapacidad(dias_totales, ibc, origen): Si origen=común: días 1-2 al 100% (empleador), días 3+ al 66.67% (EPS). Si origen=laboral: todos los días al 100% (ARL). 4) FUNCIÓN prorrata_prestaciones(salario, dias_trabajados, tipo_prestacion): Cesantías: (salario × dias) / 360. Prima: (salario × dias_semestre) / 360. 5) Validación: Evitar doble conteo en combinaciones de recargos. Aplicar fórmulas de manera secuencial y acumulativa según jurisprudencia.',
  'concepto',
  'Prácticas de ingeniería de conocimiento',
  2025,
  'operativo',
  ARRAY['engineering', 'snippets', 'pseudocode', 'funciones', 'calculo'],
  '{"id": "RAG-UTILS001"}'::jsonb,
  'Recomendaciones técnicas y snippets lógicos para el motor RAG: valor_hora(salario, jornada_actual), calcular_recargo(tipo, horas, es_extra, es_festivo, nocturno), liquidacion_incapacidad(dias, salario, origen), prorrata_prestaciones(salario, dias_trabajados).',
  ARRAY['Prácticas de ingeniería de conocimiento y guías de implementación RAG para aplicaciones jurídicas'],
  ARRAY['Pseudocódigo para calcular hora extra nocturna en festivo sin doble conteo de recargos', 'Regla de negocio: validar que la suma de recargos no sea inferior a aplicar multiplicadores por separado'],
  'funciones operativas para integrar en capa de negocio',
  NULL,
  '2025-10-06'::date
),

-- Documento 16: RAG-MT001
(
  'Mantenimiento y temporal_validity - plan de revisiones',
  'Plan para revisar y actualizar el RAG: 1) Revisiones trimestrales automáticas: Verificar cambios normativos publicados por Ministerio de Trabajo, DIAN, Ministerio de Salud. 2) Revisión especial fin/comienzo de año: Actualizar SMMLV (diciembre/enero), UVT (enero), porcentajes de aportes si cambian. 3) Verificación tras eventos especiales: Circulares del Ministerio de Trabajo, sentencias de Corte Suprema de Justicia o Corte Constitucional de alto impacto, publicación de nuevas leyes laborales. 4) Metadata de control: Incluir fecha de última verificación (temporal_validity), responsable de actualización, referencias a documentos oficiales. 5) Alertas programadas: SMMLV en diciembre, reducción de jornada (Ley 2101) en julio, cambios de tarifas ARL. 6) Versionado: Mantener histórico de cambios para auditoría y trazabilidad.',
  'concepto',
  'Mejores prácticas de gobernanza de conocimiento',
  2025,
  'mantenimiento',
  ARRAY['mantenimiento', 'governance', 'versioning', 'actualizacion', 'alertas'],
  '{"id": "RAG-MT001"}'::jsonb,
  'Plan para revisar y actualizar el RAG: revisiones trimestrales automáticas sobre cambios normativos, revisión especial a fin y comienzo de año (salario mínimo), y verificación tras circulares del Ministerio de Trabajo o sentencias de alto impacto.',
  ARRAY['Mejores prácticas de gobernanza de conocimiento y mantenimiento de RAG'],
  ARRAY['Programar alerta para revisar SMMLV cuando se publique el decreto anual (diciembre)', 'Revisión inmediata tras publicación de nuevas sentencias de la Corte o conceptos del MinTrabajo'],
  'metadatos para alertas y revisiones',
  NULL,
  '2025-10-06'::date
)

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  document_type = EXCLUDED.document_type,
  reference = EXCLUDED.reference,
  year = EXCLUDED.year,
  topic = EXCLUDED.topic,
  keywords = EXCLUDED.keywords,
  metadata = EXCLUDED.metadata,
  summary = EXCLUDED.summary,
  sources = EXCLUDED.sources,
  examples = EXCLUDED.examples,
  embedding_hint = EXCLUDED.embedding_hint,
  note = EXCLUDED.note,
  temporal_validity = EXCLUDED.temporal_validity,
  updated_at = now();