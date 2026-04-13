import { describe, it, expect } from 'vitest';
import { calculateEndDate, calculateBusinessDays, getVacationBreakdown } from '../businessDayCalculator';

describe('businessDayCalculator', () => {
  describe('calculateEndDate', () => {
    it('calcula fecha fin para 1 dia habil (dia normal)', () => {
      // 2026-01-05 es lunes → 1 día hábil = mismo día
      const result = calculateEndDate('2026-01-05', 1, ['sabado', 'domingo']);
      expect(result).toBe('2026-01-05');
    });

    it('calcula fecha fin para 5 dias habiles (semana laboral)', () => {
      // 2026-01-05 (lunes) + 5 días hábiles = 2026-01-09 (viernes)
      const result = calculateEndDate('2026-01-05', 5, ['sabado', 'domingo']);
      expect(result).toBe('2026-01-09');
    });

    it('salta fines de semana correctamente', () => {
      // 2026-02-02 (lunes, sin festivos cerca) + 6 días hábiles
      // Días: 2(lun),3(mar),4(mie),5(jue),6(vie),[7,8 fds],9(lun) = 6 días
      const result = calculateEndDate('2026-02-02', 6, ['sabado', 'domingo']);
      expect(result).toBe('2026-02-09');
    });

    it('salta festivos colombianos', () => {
      // 2026-01-05 (lunes) + 6 días hábiles
      // Reyes Magos 2026: lunes 12 de enero (Ley Emiliani)
      // Días hábiles: 5(lun),6(mar),7(mie),8(jue),9(vie),[10,11 fds],[12 festivo],13(mar)
      // 6to día hábil = 13 enero (el 12 es festivo, se salta)
      const result = calculateEndDate('2026-01-05', 6, ['sabado', 'domingo']);
      expect(result).toBe('2026-01-13');

      // 7 días hábiles = 14 enero
      const result7 = calculateEndDate('2026-01-05', 7, ['sabado', 'domingo']);
      expect(result7).toBe('2026-01-14');
    });

    it('15 dias habiles de vacaciones legales', () => {
      // Caso real: 15 días hábiles de vacaciones desde 2026-01-05 (lunes)
      // Festivo: 12 enero (Reyes Magos, lunes Emiliani)
      // Semana 1: 5,6,7,8,9 (5 días) → fds 10,11
      // Semana 2: [12 festivo], 13,14,15,16 (4 días, total 9) → fds 17,18
      // Semana 3: 19,20,21,22,23 (5 días, total 14) → fds 24,25
      // Semana 4: 26 (1 día, total 15)
      const result = calculateEndDate('2026-01-05', 15, ['sabado', 'domingo']);
      expect(result).toBe('2026-01-26');
    });

    it('maneja empleado con solo domingo como descanso', () => {
      // Si solo descansa domingo, sábados cuentan como hábiles
      // 2026-01-05 (lunes) + 6 días = sábado 10
      const result = calculateEndDate('2026-01-05', 6, ['domingo']);
      expect(result).toBe('2026-01-10');
    });

    it('retorna misma fecha si dias es 0', () => {
      const result = calculateEndDate('2026-01-05', 0, ['sabado', 'domingo']);
      expect(result).toBe('2026-01-05');
    });

    it('maneja inicio en fin de semana', () => {
      // 2026-01-10 es sábado → primer día hábil es lunes 12... pero 12 es festivo
      // → primer día hábil real es martes 13
      const result = calculateEndDate('2026-01-10', 1, ['sabado', 'domingo']);
      expect(result).toBe('2026-01-13');
    });
  });

  describe('calculateBusinessDays', () => {
    it('cuenta dias habiles en una semana laboral', () => {
      // Lunes 5 a viernes 9 = 5 días hábiles
      const result = calculateBusinessDays('2026-01-05', '2026-01-09', ['sabado', 'domingo']);
      expect(result).toBe(5);
    });

    it('excluye fines de semana', () => {
      // Lunes 5 a domingo 11 = 5 días hábiles (excluye sáb 10 y dom 11)
      const result = calculateBusinessDays('2026-01-05', '2026-01-11', ['sabado', 'domingo']);
      expect(result).toBe(5);
    });

    it('excluye festivos', () => {
      // Lunes 5 a martes 13 enero 2026
      // Hábiles: 5,6,7,8,9 + 13 = 6 (excluye fds 10,11 y festivo 12)
      const result = calculateBusinessDays('2026-01-05', '2026-01-13', ['sabado', 'domingo']);
      expect(result).toBe(6);
    });

    it('retorna 0 para mismo dia si es fds', () => {
      // 2026-01-10 es sábado
      const result = calculateBusinessDays('2026-01-10', '2026-01-10', ['sabado', 'domingo']);
      expect(result).toBe(0);
    });

    it('retorna 1 para mismo dia si es habil', () => {
      const result = calculateBusinessDays('2026-01-05', '2026-01-05', ['sabado', 'domingo']);
      expect(result).toBe(1);
    });
  });

  describe('getVacationBreakdown', () => {
    it('retorna desglose completo para 15 dias habiles', () => {
      const breakdown = getVacationBreakdown('2026-01-05', 15, ['sabado', 'domingo']);

      expect(breakdown.businessDays).toBe(15);
      expect(breakdown.endDate).toBe('2026-01-26');
      expect(breakdown.calendarDays).toBeGreaterThan(15);
      expect(breakdown.restDaysCount).toBeGreaterThan(0);
      // Festivo: Reyes Magos (12 enero)
      expect(breakdown.holidaysCount).toBe(1);
      expect(breakdown.holidayNames).toContain('Reyes Magos');
    });

    it('retorna desglose vacio para 0 dias', () => {
      const breakdown = getVacationBreakdown('2026-01-05', 0, ['sabado', 'domingo']);
      expect(breakdown.businessDays).toBe(0);
      expect(breakdown.calendarDays).toBe(0);
      expect(breakdown.restDaysCount).toBe(0);
      expect(breakdown.holidaysCount).toBe(0);
      expect(breakdown.endDate).toBe('2026-01-05');
    });

    it('los totales cuadran: calendario = habiles + descanso + festivos', () => {
      const breakdown = getVacationBreakdown('2026-01-05', 15, ['sabado', 'domingo']);
      expect(breakdown.calendarDays).toBe(
        breakdown.businessDays + breakdown.restDaysCount + breakdown.holidaysCount
      );
    });

    it('identifica festivos de Semana Santa', () => {
      // Semana Santa 2026: Jueves 2 abril, Viernes 3 abril
      const breakdown = getVacationBreakdown('2026-03-30', 10, ['sabado', 'domingo']);
      expect(breakdown.holidayNames).toContain('Jueves Santo');
      expect(breakdown.holidayNames).toContain('Viernes Santo');
    });

    it('maneja vacaciones que cruzan fin de año', () => {
      // Vacaciones desde dic 2026 que cruzan a enero 2027
      const breakdown = getVacationBreakdown('2026-12-21', 15, ['sabado', 'domingo']);
      expect(breakdown.businessDays).toBe(15);
      // Debe incluir festivos de ambos años (Navidad 25 dic, Año Nuevo 1 ene)
      expect(breakdown.holidayNames).toContain('Navidad');
      expect(breakdown.holidayNames).toContain('Año Nuevo');
    });

    it('maneja empleado con descanso diferente', () => {
      // Solo domingo como descanso → sábados cuentan como hábiles
      const breakdownStandard = getVacationBreakdown('2026-01-05', 10, ['sabado', 'domingo']);
      const breakdownCustom = getVacationBreakdown('2026-01-05', 10, ['domingo']);

      // Con menos días de descanso, la fecha fin debería ser antes o igual
      expect(new Date(breakdownCustom.endDate).getTime()).toBeLessThanOrEqual(
        new Date(breakdownStandard.endDate).getTime()
      );
      // Y debería tener menos días de descanso
      expect(breakdownCustom.restDaysCount).toBeLessThan(breakdownStandard.restDaysCount);
    });

    it('muestra nombre de festivo que cae en dia de descanso', () => {
      // Navidad 2022 (25 dic) cae en domingo → es día de descanso Y festivo
      // El nombre debe aparecer en holidayNames pero no incrementar holidaysCount
      const breakdown = getVacationBreakdown('2022-12-19', 5, ['sabado', 'domingo']);
      // 19(lun),20(mar),21(mie),22(jue),23(vie) = 5 días hábiles → endDate = 23 dic
      expect(breakdown.endDate).toBe('2022-12-23');
      // Sáb 24 y Dom 25 no están en el rango (endDate es 23)
      // Probemos con un rango que incluya el 25
      const breakdown2 = getVacationBreakdown('2022-12-19', 8, ['sabado', 'domingo']);
      // 19-23 = 5 días, fds 24-25, 26(lun)=6, 27(mar)=7, 28(mie)=8 → endDate = 28
      expect(breakdown2.endDate).toBe('2022-12-28');
      // Navidad (25 dic, domingo) cae en descanso → nombre debe aparecer
      expect(breakdown2.holidayNames).toContain('Navidad');
      // Pero no debe contarse como festivo aparte (ya se cuenta como descanso)
      // La invariante cambia: calendarDays = businessDays + restDaysCount + holidaysCount
      // El festivo en descanso NO incrementa holidaysCount
      expect(breakdown2.calendarDays).toBe(
        breakdown2.businessDays + breakdown2.restDaysCount + breakdown2.holidaysCount
      );
    });
  });

  describe('roundtrip consistency', () => {
    it('calculateBusinessDays(start, calculateEndDate(start, N)) === N', () => {
      const testCases = [
        { start: '2026-01-05', days: 1 },
        { start: '2026-01-05', days: 5 },
        { start: '2026-01-05', days: 15 },
        { start: '2026-03-30', days: 10 },
        { start: '2026-12-21', days: 15 },
      ];

      for (const { start, days } of testCases) {
        const endDate = calculateEndDate(start, days, ['sabado', 'domingo']);
        const counted = calculateBusinessDays(start, endDate, ['sabado', 'domingo']);
        expect(counted, `roundtrip failed for start=${start}, days=${days}`).toBe(days);
      }
    });
  });
});
