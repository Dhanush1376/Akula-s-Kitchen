import { describe, it, expect } from 'vitest';
import {
  parseCutoffTime,
  formatCutoffTimeDisplay,
  getEffectiveMenuDay,
} from '../menuScheduleUtils';

describe('menuScheduleUtils', () => {
  describe('parseCutoffTime', () => {
    it('defaults to 18:00 (6:00 PM) when empty or null', () => {
      expect(parseCutoffTime()).toEqual({ hours: 18, minutes: 0, totalMinutes: 1080 });
      expect(parseCutoffTime(null)).toEqual({ hours: 18, minutes: 0, totalMinutes: 1080 });
      expect(parseCutoffTime('')).toEqual({ hours: 18, minutes: 0, totalMinutes: 1080 });
    });

    it('returns null when cutoff is disabled', () => {
      expect(parseCutoffTime('disabled')).toBeNull();
      expect(parseCutoffTime('none')).toBeNull();
      expect(parseCutoffTime('off')).toBeNull();
    });

    it('parses 24-hour time strings', () => {
      expect(parseCutoffTime('17:00')).toEqual({ hours: 17, minutes: 0, totalMinutes: 1020 });
      expect(parseCutoffTime('18:30')).toEqual({ hours: 18, minutes: 30, totalMinutes: 1110 });
      expect(parseCutoffTime('06:15')).toEqual({ hours: 6, minutes: 15, totalMinutes: 375 });
    });

    it('parses 12-hour AM/PM time strings', () => {
      expect(parseCutoffTime('6:00 PM')).toEqual({ hours: 18, minutes: 0, totalMinutes: 1080 });
      expect(parseCutoffTime('7:30 pm')).toEqual({ hours: 19, minutes: 30, totalMinutes: 1170 });
      expect(parseCutoffTime('11:00 AM')).toEqual({ hours: 11, minutes: 0, totalMinutes: 660 });
      expect(parseCutoffTime('12:00 PM')).toEqual({ hours: 12, minutes: 0, totalMinutes: 720 });
      expect(parseCutoffTime('12:00 AM')).toEqual({ hours: 0, minutes: 0, totalMinutes: 0 });
    });
  });

  describe('formatCutoffTimeDisplay', () => {
    it('formats 24-hour strings to friendly 12-hour AM/PM', () => {
      expect(formatCutoffTimeDisplay('18:00')).toBe('6:00 PM');
      expect(formatCutoffTimeDisplay('17:30')).toBe('5:30 PM');
      expect(formatCutoffTimeDisplay('09:00')).toBe('9:00 AM');
    });

    it('handles disabled state', () => {
      expect(formatCutoffTimeDisplay('disabled')).toBe('Midnight (Disabled)');
    });
  });

  describe('getEffectiveMenuDay', () => {
    // Thursday Oct 29, 2026
    const baseThursday = new Date(2026, 9, 29); // 2026-10-29 is a Thursday

    it('shows today (Thursday) during daytime before 6 PM cutoff', () => {
      // 10:30 AM on Thursday
      const morningDate = new Date(baseThursday);
      morningDate.setHours(10, 30, 0, 0);

      const result = getEffectiveMenuDay('18:00', morningDate);
      expect(result.todayKey).toBe('thursday');
      expect(result.tomorrowKey).toBe('friday');
      expect(result.effectiveDayKey).toBe('thursday');
      expect(result.isAfterCutoff).toBe(false);
      expect(result.isTomorrow).toBe(false);
      expect(result.isToday).toBe(true);
    });

    it('shows today at 5:59 PM (1 minute before cutoff)', () => {
      const nearCutoff = new Date(baseThursday);
      nearCutoff.setHours(17, 59, 0, 0);

      const result = getEffectiveMenuDay('18:00', nearCutoff);
      expect(result.effectiveDayKey).toBe('thursday');
      expect(result.isTomorrow).toBe(false);
    });

    it('automatically transitions to tomorrow (Friday) at 6:00 PM', () => {
      const atCutoff = new Date(baseThursday);
      atCutoff.setHours(18, 0, 0, 0);

      const result = getEffectiveMenuDay('18:00', atCutoff);
      expect(result.todayKey).toBe('thursday');
      expect(result.tomorrowKey).toBe('friday');
      expect(result.effectiveDayKey).toBe('friday');
      expect(result.isAfterCutoff).toBe(true);
      expect(result.isTomorrow).toBe(true);
      expect(result.isToday).toBe(false);
      expect(result.effectiveDate.getDate()).toBe(30); // Friday Oct 30
    });

    it('continues showing tomorrow late in the evening at 11:59 PM', () => {
      const lateEvening = new Date(baseThursday);
      lateEvening.setHours(23, 59, 0, 0);

      const result = getEffectiveMenuDay('18:00', lateEvening);
      expect(result.effectiveDayKey).toBe('friday');
      expect(result.isTomorrow).toBe(true);
    });

    it('rolls over to today at 12:00 AM midnight (Friday becomes today!)', () => {
      // Friday Oct 30 at 00:00 (Midnight)
      const midnightFriday = new Date(2026, 9, 30, 0, 0, 0);

      const result = getEffectiveMenuDay('18:00', midnightFriday);
      // Now today IS Friday!
      expect(result.todayKey).toBe('friday');
      expect(result.tomorrowKey).toBe('saturday');
      expect(result.effectiveDayKey).toBe('friday');
      expect(result.isAfterCutoff).toBe(false);
      expect(result.isTomorrow).toBe(false);
      expect(result.isToday).toBe(true);
      expect(result.effectiveDate.getDate()).toBe(30); // Still Oct 30
    });

    it('rolls Saturday evening over to Sunday, and Sunday midnight rolls to Sunday today', () => {
      // Saturday Oct 31 at 18:30 (After 6 PM)
      const saturdayEvening = new Date(2026, 9, 31, 18, 30, 0);
      const satResult = getEffectiveMenuDay('18:00', saturdayEvening);
      expect(satResult.todayKey).toBe('saturday');
      expect(satResult.tomorrowKey).toBe('sunday');
      expect(satResult.effectiveDayKey).toBe('sunday');
      expect(satResult.isTomorrow).toBe(true);

      // Sunday Nov 1 at 00:01 (After Midnight)
      const sundayMidnight = new Date(2026, 10, 1, 0, 1, 0);
      const sunResult = getEffectiveMenuDay('18:00', sundayMidnight);
      expect(sunResult.todayKey).toBe('sunday');
      expect(sunResult.tomorrowKey).toBe('monday');
      expect(sunResult.effectiveDayKey).toBe('sunday');
      expect(sunResult.isTomorrow).toBe(false);
    });

    it('stays on today when cutoff is disabled', () => {
      const lateEvening = new Date(baseThursday);
      lateEvening.setHours(23, 30, 0, 0);

      const result = getEffectiveMenuDay('disabled', lateEvening);
      expect(result.effectiveDayKey).toBe('thursday');
      expect(result.isAfterCutoff).toBe(false);
      expect(result.isTomorrow).toBe(false);
    });
  });
});
