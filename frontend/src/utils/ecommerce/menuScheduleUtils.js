/**
 * Menu Schedule Utilities
 *
 * Handles daily rotating menu calculation, evening cutoff time transitions,
 * and next-day rollover logic.
 *
 * Behavior:
 * - Before Cutoff Time (e.g. 12:00 AM - 5:59 PM): Displays Today's scheduled menu.
 * - After Cutoff Time (e.g. 6:00 PM - 11:59 PM): Automatically transitions to display
 *   Tomorrow's scheduled menu (with Tomorrow indicator).
 * - After Midnight (12:00 AM onwards): Date rolls over naturally, so yesterday's
 *   "tomorrow" is now officially "today"!
 */

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon', index: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', index: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', index: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', index: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', index: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', index: 6 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', index: 0 },
];

export const DAY_KEY_MAP = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Standard preset cutoff times for admin UI.
 */
export const CUTOFF_TIME_PRESETS = [
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM (Default)' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: 'disabled', label: 'Midnight Only (Disabled)' },
];

/**
 * Parses cutoff time into hours, minutes, and total minutes from midnight.
 * Defaults to 18:00 (6:00 PM) if not specified.
 */
export function parseCutoffTime(cutoffTime) {
  if (cutoffTime === 'disabled' || cutoffTime === 'none' || cutoffTime === 'off') {
    return null;
  }

  // Default to 18:00 (6:00 PM) if omitted or empty
  if (cutoffTime === undefined || cutoffTime === null || cutoffTime === '') {
    return { hours: 18, minutes: 0, totalMinutes: 18 * 60 };
  }

  if (typeof cutoffTime === 'number') {
    const hours = Math.max(0, Math.min(23, Math.floor(cutoffTime)));
    return { hours, minutes: 0, totalMinutes: hours * 60 };
  }

  const str = String(cutoffTime).trim();
  // Match 24h format "HH:MM" or "H:MM"
  const match24 = str.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  }

  // Match 12h format "H[:MM] AM/PM"
  const match12 = str.match(/^([1-9]|1[0-2])(?::([0-5][0-9]))?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const isPm = match12[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  }

  // Fallback to default 6:00 PM (18:00)
  return { hours: 18, minutes: 0, totalMinutes: 18 * 60 };
}

/**
 * Formats cutoff time into user-friendly 12-hour format (e.g. "6:00 PM").
 */
export function formatCutoffTimeDisplay(cutoffTime) {
  const parsed = parseCutoffTime(cutoffTime);
  if (!parsed) return 'Midnight (Disabled)';

  const { hours, minutes } = parsed;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ':00';
  return `${displayHours}${displayMinutes} ${period}`;
}

const WEEKDAY_INDEX_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns date parts strictly in India Standard Time (IST, UTC+5:30).
 */
export function getISTDateParts(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    let hours = parseInt(map.hour, 10);
    if (hours === 24) hours = 0;
    const minutes = parseInt(map.minute, 10);
    const day = parseInt(map.day, 10);
    const month = parseInt(map.month, 10);
    const year = parseInt(map.year, 10);
    const dayIndex = WEEKDAY_INDEX_MAP[map.weekday] ?? date.getDay();
    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      day,
      month,
      year,
      weekday: map.weekday,
      dayIndex,
    };
  } catch {
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      totalMinutes: date.getHours() * 60 + date.getMinutes(),
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      weekday: 'Mon',
      dayIndex: date.getDay(),
    };
  }
}

/**
 * Returns current timestamp converted to India Standard Time (IST, UTC+5:30),
 * matching the kitchen's operational time zone.
 */
export function getNowInIST(customDate = null) {
  if (customDate instanceof Date) return customDate;
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5.5);
}

/**
 * Calculates effective menu day and tomorrow transition state.
 *
 * @param {string|number|null} cutoffTime - e.g. '18:00'
 * @param {Date|null} customDate - Optional custom Date for testing / simulation
 * @returns {Object} Effective day resolution
 */
export function getEffectiveMenuDay(cutoffTime = '18:00', customDate = null) {
  const baseDate = customDate instanceof Date ? customDate : new Date();
  const istParts = getISTDateParts(baseDate);
  const todayIndex = istParts.dayIndex; // 0 is Sunday
  const todayKey = DAY_KEY_MAP[todayIndex] || 'thursday';

  const tomorrowIndex = (todayIndex + 1) % 7;
  const tomorrowKey = DAY_KEY_MAP[tomorrowIndex] || 'friday';

  const parsedCutoff = parseCutoffTime(cutoffTime);
  const currentMinutes = istParts.totalMinutes;

  const isAfterCutoff = Boolean(parsedCutoff && currentMinutes >= parsedCutoff.totalMinutes);
  const isTomorrow = isAfterCutoff;
  const isToday = !isTomorrow;

  const effectiveDayKey = isTomorrow ? tomorrowKey : todayKey;

  const effectiveDate = new Date(baseDate);
  if (isTomorrow) {
    effectiveDate.setDate(effectiveDate.getDate() + 1);
  }

  const todayMeta = DAYS_OF_WEEK.find((d) => d.key === todayKey) || DAYS_OF_WEEK[0];
  const tomorrowMeta = DAYS_OF_WEEK.find((d) => d.key === tomorrowKey) || DAYS_OF_WEEK[0];
  const effectiveMeta = isTomorrow ? tomorrowMeta : todayMeta;

  const formattedEffectiveDate = effectiveDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const formattedEffectiveDateWithYear = effectiveDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTodayDate = baseDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return {
    todayKey,
    tomorrowKey,
    todayMeta,
    tomorrowMeta,
    effectiveDayKey,
    effectiveMeta,
    isAfterCutoff,
    isTomorrow,
    isToday,
    effectiveDate,
    now: baseDate,
    cutoffTime: parsedCutoff
      ? `${String(parsedCutoff.hours).padStart(2, '0')}:${String(parsedCutoff.minutes).padStart(2, '0')}`
      : 'disabled',
    cutoffDisplay: formatCutoffTimeDisplay(cutoffTime),
    formattedEffectiveDate,
    formattedEffectiveDateWithYear,
    formattedTodayDate,
  };
}

/**
 * Returns an array of day objects for the 7-day week (Monday to Sunday)
 * anchored around the reference date (e.g. today or effective tomorrow).
 *
 * @param {Date|string|number} refDate
 * @returns {Array<{key: string, label: string, short: string, index: number, date: Date, dayNumber: number, monthShort: string, formattedDate: string}>}
 */
export function getWeekDates(refDate = null) {
  const now = refDate instanceof Date ? refDate : refDate ? new Date(refDate) : getNowInIST();
  const currentDayIndex = now.getDay(); // 0 is Sunday, 1 is Monday...
  // Days from Monday (Monday = 0 offset, Sunday = 6 offset)
  const mondayOffset = (currentDayIndex + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return DAYS_OF_WEEK.map((d, i) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    return {
      ...d,
      date: dayDate,
      dayNumber: dayDate.getDate(),
      monthShort: dayDate.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
      formattedDate: dayDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
    };
  });
}
