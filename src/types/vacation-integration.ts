// Backward compatibility - re-export from absence-integration.ts
export type {
  DisplayNovedad,
  SeparatedTotals,
  AbsenceIntegrationResult as VacationIntegrationResult,
  AbsenceProcessingOptions as VacationProcessingOptions
} from './absence-integration';

export {
  UNIFIED_STATUS_MAPPING,
  VACATION_VISUAL_CONFIG,
  ABSENCE_VISUAL_CONFIG,
  NOVEDAD_VISUAL_CONFIG,
  convertVacationToDisplay,
  convertAbsenceToDisplay,
  convertNovedadToDisplay
} from './absence-integration';
