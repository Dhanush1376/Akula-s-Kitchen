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

/**
 * Calculates effective menu day and tomorrow transition state.
 *
 * @param {string|number|null} cutoffTime - e.g. '18:00'
 * @param {Date|null} customDate - Optional custom Date for testing / simulation
 * @returns {Object} Effective day resolution
 */
export function getEffectiveMenuDay(cutoffTime = '18:00', customDate = null) {
  const now = customDate instanceof Date ? customDate : new Date();
  const todayIndex = now.getDay(); // 0 is Sunday
  const todayKey = DAY_KEY_MAP[todayIndex] || 'thursday';

  const tomorrowIndex = (todayIndex + 1) % 7;
  const tomorrowKey = DAY_KEY_MAP[tomorrowIndex] || 'friday';

  const parsedCutoff = parseCutoffTime(cutoffTime);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isAfterCutoff = Boolean(parsedCutoff && currentMinutes >= parsedCutoff.totalMinutes);
  const isTomorrow = isAfterCutoff;
  const isToday = !isTomorrow;

  const effectiveDayKey = isTomorrow ? tomorrowKey : todayKey;

  const effectiveDate = new Date(now);
  if (isTomorrow) {
    effectiveDate.setDate(now.getDate() + 1);
  }

  const todayMeta = DAYS_OF_WEEK.find((d) => d.key === todayKey) || DAYS_OF_WEEK[0];
  const tomorrowMeta = DAYS_OF_WEEK.find((d) => d.key === tomorrowKey) || DAYS_OF_WEEK[0];
  const effectiveMeta = isTomorrow ? tomorrowMeta : todayMeta;

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
    now,
    cutoffTime: parsedCutoff
      ? `${String(parsedCutoff.hours).padStart(2, '0')}:${String(parsedCutoff.minutes).padStart(2, '0')}`
      : 'disabled',
    cutoffDisplay: formatCutoffTimeDisplay(cutoffTime),
    formattedEffectiveDate: effectiveDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    formattedTodayDate: now.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
  };
}
