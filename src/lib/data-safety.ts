/** Pure helpers for account isolation and progress history bounds. */
export type MonthBounds = { firstMonth: string | null; lastMonth: string | null };

export function getScopedStorageKey(baseKey: string, userId?: string | null) {
  return userId ? `${baseKey}:user:${userId}` : `${baseKey}:guest`;
}

export function mergeMonthBounds(monthKeys: string[], previous?: MonthBounds | null): MonthBounds {
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/;
  const keys = [
    ...monthKeys,
    ...(previous?.firstMonth ? [previous.firstMonth] : []),
    ...(previous?.lastMonth ? [previous.lastMonth] : []),
  ].filter((key) => validMonth.test(key)).sort();
  return { firstMonth: keys[0] ?? null, lastMonth: keys[keys.length - 1] ?? null };
}

/** Yesterday's streak stays active until the end of today. */
export function countCurrentStreak(dayKeys: Iterable<string>, todayKey: string) {
  const days = new Set(dayKeys);
  const cursor = new Date(`${todayKey}T12:00:00Z`);
  if (!days.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (true) {
    const day = cursor.toISOString().slice(0, 10);
    if (!days.has(day)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
