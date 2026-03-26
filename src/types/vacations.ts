// Backward compatibility - re-export from absences.ts
export type {
  AbsenceType as VacationAbsenceType,
  EmployeeAbsence as VacationAbsence,
  AbsenceFormData as VacationAbsenceFormData,
  AbsenceFilters as VacationAbsenceFilters,
  AbsenceStatus as VacationAbsenceStatus
} from './absences';

export {
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  VACATION_SUBTYPES,
  requiresSubtype,
  getSubtypesForType,
  getVacationAbsenceTypes,
  ABSENCE_TYPE_LABELS as ABSENCE_TYPE_LABELS_COMPAT,
  ABSENCE_TYPE_COLORS as ABSENCE_TYPE_COLORS_COMPAT
} from './absences';
