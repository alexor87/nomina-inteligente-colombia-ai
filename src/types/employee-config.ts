
export const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'fijo', label: 'Término Fijo' },
  { value: 'obra', label: 'Obra o Labor' },
  { value: 'aprendizaje', label: 'Aprendizaje' }
] as const;

export const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PEP', label: 'Permiso Especial de Permanencia' },
  { value: 'PPT', label: 'Permiso por Protección Temporal' }
] as const;
