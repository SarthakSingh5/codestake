/**
 * Timezone & Local Midnight utilities for Blood Pact & Challenge Contracts
 */

/**
 * Calculates the exact UTC Date corresponding to 11:59:59.999 PM (Local Midnight)
 * in the user's local IANA timezone.
 *
 * If isInitialSetup is true and current local time is after 8:00 PM (20:00),
 * extends the initial deadline to tomorrow midnight so late-night users have ample time.
 */
export function getLocalMidnightUTC(
  timeZone: string = 'UTC',
  daysToAdd: number = 0,
  isInitialSetup: boolean = false
): Date {
  const tz = timeZone || 'UTC';
  const now = new Date();

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(now);
  const m: Record<string, string> = {};
  parts.forEach((p) => (m[p.type] = p.value));

  const localHour = parseInt(m.hour || '0', 10);

  // If user starts after 8 PM (20:00) local time on initial day, extend to tomorrow midnight
  let extraDays = daysToAdd;
  if (isInitialSetup && localHour >= 20) {
    extraDays += 1;
  }

  const targetYear = parseInt(m.year || '2026', 10);
  const targetMonth = parseInt(m.month || '1', 10) - 1; // 0-indexed
  const targetDay = parseInt(m.day || '1', 10) + extraDays;

  // Approximate UTC by assuming zero offset
  const utcGuess = new Date(Date.UTC(targetYear, targetMonth, targetDay, 23, 59, 59, 999));

  // Determine difference between utcGuess and actual timezone time
  const guessParts = dtf.formatToParts(utcGuess);
  const gm: Record<string, string> = {};
  guessParts.forEach((p) => (gm[p.type] = p.value));

  const guessLocalTime = Date.UTC(
    parseInt(gm.year || '2026', 10),
    parseInt(gm.month || '1', 10) - 1,
    parseInt(gm.day || '1', 10),
    parseInt(gm.hour || '0', 10),
    parseInt(gm.minute || '0', 10),
    parseInt(gm.second || '0', 10)
  );

  const desiredLocalTime = Date.UTC(targetYear, targetMonth, targetDay, 23, 59, 59);
  const diffMs = desiredLocalTime - guessLocalTime;

  return new Date(utcGuess.getTime() + diffMs);
}

