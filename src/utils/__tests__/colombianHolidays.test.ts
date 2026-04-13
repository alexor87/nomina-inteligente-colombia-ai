import { describe, it, expect } from 'vitest';
import { getColombianHolidays, isColombianHoliday, getColombianHolidaysWithNames } from '../colombianHolidays';

describe('colombianHolidays', () => {
  describe('getColombianHolidays', () => {
    it('retorna exactamente 18 festivos por año', () => {
      for (const year of [2024, 2025, 2026, 2027, 2030]) {
        const holidays = getColombianHolidays(year);
        expect(holidays).toHaveLength(18);
      }
    });

    it('retorna festivos ordenados cronologicamente', () => {
      const holidays = getColombianHolidays(2026);
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i].getTime()).toBeGreaterThanOrEqual(holidays[i - 1].getTime());
      }
    });

    it('incluye los 6 festivos fijos correctos', () => {
      const holidays = getColombianHolidays(2026);
      const fixed = [
        { month: 0, day: 1 },   // Año Nuevo
        { month: 4, day: 1 },   // Día del Trabajo
        { month: 6, day: 20 },  // Independencia
        { month: 7, day: 7 },   // Batalla de Boyacá
        { month: 11, day: 8 },  // Inmaculada
        { month: 11, day: 25 }, // Navidad
      ];

      for (const { month, day } of fixed) {
        const found = holidays.some(h => h.getMonth() === month && h.getDate() === day);
        expect(found, `Festivo fijo ${month + 1}/${day} no encontrado`).toBe(true);
      }
    });

    it('los festivos Ley Emiliani siempre caen en lunes', () => {
      // Festivos Emiliani: Reyes Magos, San José, Ascensión, Corpus Christi,
      // Sagrado Corazón, San Pedro y San Pablo, Asunción, Día de la Raza,
      // Todos los Santos, Independencia de Cartagena
      for (const year of [2024, 2025, 2026, 2027]) {
        const holidays = getColombianHolidaysWithNames(year);
        const emilianiNames = [
          'Reyes Magos', 'San José', 'Ascensión del Señor', 'Corpus Christi',
          'Sagrado Corazón', 'San Pedro y San Pablo', 'Asunción de la Virgen',
          'Día de la Raza', 'Todos los Santos', 'Independencia de Cartagena'
        ];

        for (const name of emilianiNames) {
          const holiday = holidays.find(h => h.name === name);
          expect(holiday, `${name} no encontrado para ${year}`).toBeDefined();
          expect(holiday!.date.getDay(), `${name} ${year} no cae en lunes`).toBe(1);
        }
      }
    });
  });

  describe('isColombianHoliday', () => {
    it('detecta Año Nuevo como festivo', () => {
      expect(isColombianHoliday(new Date(2026, 0, 1))).toBe(true);
    });

    it('detecta Navidad como festivo', () => {
      expect(isColombianHoliday(new Date(2026, 11, 25))).toBe(true);
    });

    it('un dia normal no es festivo', () => {
      // 2 de febrero 2026 es lunes, no festivo
      expect(isColombianHoliday(new Date(2026, 1, 2))).toBe(false);
    });

    it('detecta Jueves y Viernes Santo 2026 correctamente', () => {
      // Pascua 2026: 5 de abril
      // Jueves Santo: 2 de abril, Viernes Santo: 3 de abril
      expect(isColombianHoliday(new Date(2026, 3, 2))).toBe(true);  // Jueves Santo
      expect(isColombianHoliday(new Date(2026, 3, 3))).toBe(true);  // Viernes Santo
    });
  });

  describe('getColombianHolidaysWithNames', () => {
    it('retorna 18 festivos con nombre', () => {
      const holidays = getColombianHolidaysWithNames(2026);
      expect(holidays).toHaveLength(18);
      holidays.forEach(h => {
        expect(h.name).toBeTruthy();
        expect(h.date).toBeInstanceOf(Date);
      });
    });

    it('Reyes Magos 2026 se traslada al lunes 12 de enero', () => {
      // 6 de enero 2026 es martes → se traslada al lunes 12 de enero
      const holidays = getColombianHolidaysWithNames(2026);
      const reyes = holidays.find(h => h.name === 'Reyes Magos')!;
      expect(reyes.date.getMonth()).toBe(0);  // Enero
      expect(reyes.date.getDate()).toBe(12);  // Lunes 12
      expect(reyes.date.getDay()).toBe(1);    // Lunes
    });

    it('verifica festivos conocidos de 2025', () => {
      const holidays = getColombianHolidaysWithNames(2025);

      // Pascua 2025: 20 de abril
      const juevesSanto = holidays.find(h => h.name === 'Jueves Santo')!;
      expect(juevesSanto.date.getMonth()).toBe(3);  // Abril
      expect(juevesSanto.date.getDate()).toBe(17);   // 17 de abril

      const viernesSanto = holidays.find(h => h.name === 'Viernes Santo')!;
      expect(viernesSanto.date.getMonth()).toBe(3);
      expect(viernesSanto.date.getDate()).toBe(18);
    });
  });

  describe('Pascua - algoritmo Butcher/Meeus', () => {
    it('calcula Pascua correctamente para años conocidos', () => {
      // Fechas de Pascua verificadas:
      // 2024: 31 marzo, 2025: 20 abril, 2026: 5 abril, 2027: 28 marzo
      const testCases = [
        { year: 2024, month: 2, day: 31 },  // 31 marzo
        { year: 2025, month: 3, day: 20 },  // 20 abril
        { year: 2026, month: 3, day: 5 },   // 5 abril
        { year: 2027, month: 2, day: 28 },  // 28 marzo
      ];

      for (const { year, month, day } of testCases) {
        const holidays = getColombianHolidaysWithNames(year);
        // Viernes Santo = Pascua - 2
        const viernesSanto = holidays.find(h => h.name === 'Viernes Santo')!;
        const pascua = new Date(viernesSanto.date);
        pascua.setDate(pascua.getDate() + 2);
        expect(pascua.getMonth(), `Pascua ${year} mes incorrecto`).toBe(month);
        expect(pascua.getDate(), `Pascua ${year} día incorrecto`).toBe(day);
      }
    });
  });
});
