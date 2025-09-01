// Shared interfaces for import processes (Employee and Novelty imports)

export interface ImportedRow {
  [key: string]: any;
  _rowIndex?: number;
  _errors?: string[];
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  isRequired: boolean;
  validation: 'valid' | 'warning' | 'error';
}

export interface ImportData {
  file: File;
  columns: string[];
  rows: ImportedRow[];
  mappings?: ColumnMapping[];
  validRows?: ImportedRow[];
  invalidRows?: ImportedRow[];
  mapping?: Record<string, string>;
  totalRows?: number;
  errors?: string[];
}

export interface ImportStep {
  step: 'upload' | 'mapping' | 'validation' | 'confirmation';
  data?: ImportData;
}