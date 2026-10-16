import type { Habit, Score, TrackerState } from "../storage";

export const scoreLabels: Record<Score, string> = {
  1: "трудно",
  2: "нестабильно",
  3: "получается",
  4: "уверенно",
  5: "свободно",
};

export const scoreColors: Record<Score, string> = {
  1: "#e66767",
  2: "#f0a24a",
  3: "#e8cf52",
  4: "#70b86f",
  5: "#4b8fe2",
};

export const habitColors = ["#2f80ed", "#2f9e6d", "#d46b32", "#8f5bd3", "#c44569"];
export const popoverWidth = 180;
export const popoverHeight = 254;
export const noteEditorWidth = 420;
export const noteEditorHeight = 320;
export const longHabitNameLimit = 38;
export const dayNoteLimit = 500;
export const themeStorageKey = "beat-by-bit-theme";
export const defaultCalendarPeriod = 10;
export const mobileCalendarPeriod = 6;
export const trailingFutureDays = 2;
export const calendarPeriodOptions = [7, 10, 14, 30] as const;

export type Theme = "light" | "dark";
export type AuthMode = "signin" | "signup";
export type ChartRange = "week" | "month" | "all";
export type ChartView = "donut" | "timeline";
export type CalendarPeriod = (typeof calendarPeriodOptions)[number];

export const chartRanges: Record<ChartRange, string> = {
  week: "Неделя",
  month: "Месяц",
  all: "Всё время",
};

export const chartViews: Record<ChartView, string> = {
  donut: "Круговая",
  timeline: "По дням",
};

export const calendarPeriodLabels: Record<CalendarPeriod, string> = {
  7: "7 дней",
  10: "10 дней",
  14: "14 дней",
  30: "Месяц",
};

export type HabitRow = Habit & {
  depth: number;
  childCount: number;
};

export type PickerState = {
  key: string;
  habitId: string;
  habitName: string;
  date: string;
  top: number;
  left: number;
};

export type NoteEditorState =
  | {
      type: "day";
      date: string;
      top: number;
      left: number;
    }
  | {
      type: "entry";
      date: string;
      habitId: string;
      habitName: string;
      top: number;
      left: number;
    };

export type TrackerStats = {
  habitCount: number;
  total: number;
  trackedDays: number;
  currentStreak: number;
  bestStreak: number;
};

export function loadTheme(): Theme {
  const savedTheme = localStorage.getItem(themeStorageKey);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function isFutureDay(day: string, todayKey = dateKey(new Date())) {
  return day > todayKey;
}

export function getDateWindow(anchor: string | Date, totalDays: number) {
  const dates: Date[] = [];
  const anchorDate = typeof anchor === "string" ? parseDateKey(anchor) : new Date(anchor);
  const daysAfter = Math.min(trailingFutureDays, Math.max(totalDays - 1, 0));
  const daysBefore = totalDays - daysAfter - 1;

  for (let offset = -daysBefore; offset <= daysAfter; offset += 1) {
    const date = new Date(anchorDate);
    date.setDate(anchorDate.getDate() + offset);
    dates.push(date);
  }
  return dates;
}

export function shiftDate(day: string, deltaDays: number) {
  const nextDate = parseDateKey(day);
  nextDate.setDate(nextDate.getDate() + deltaDays);
  return dateKey(nextDate);
}

export function getDayDistance(fromDay: string, toDay: string) {
  const fromDate = parseDateKey(fromDay);
  const toDate = parseDateKey(toDay);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

export function getEffectiveCalendarAnchorDate(savedAnchorDate: string | undefined, todayKey: string) {
  return savedAnchorDate || todayKey;
}

export function shiftMonth(day: string, deltaMonths: number) {
  const current = parseDateKey(day);
  const preferredDay = current.getDate();
  const next = new Date(current);
  next.setDate(1);
  next.setMonth(next.getMonth() + deltaMonths);

  const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(preferredDay, lastDayOfMonth));

  return dateKey(next);
}

export function formatRangeLabel(dates: Date[]) {
  if (!dates.length) return "";
  const first = dates[0];
  const last = dates[dates.length - 1];

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).formatRange(first, last);
}

export function getMonthInputValue(day: string) {
  return day.slice(0, 7);
}

export function applyMonthToAnchor(currentDay: string, monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const preferredDay = parseDateKey(currentDay).getDate();
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const nextDate = new Date(year, month - 1, Math.min(preferredDay, lastDayOfMonth), 12);
  return dateKey(nextDate);
}

export function getMonthKey(value: string | Date) {
  return (typeof value === "string" ? value : dateKey(value)).slice(0, 7);
}

export function getMonthKeysForDates(dates: Date[]) {
  return [...new Set(dates.map((date) => getMonthKey(date)))];
}

export function getMonthKeysBetween(startMonth: string, endMonth: string) {
  const result: string[] = [];
  const cursor = new Date(`${startMonth}-01T12:00:00`);
  const last = new Date(`${endMonth}-01T12:00:00`);

  while (cursor <= last) {
    result.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

export function getMonthDates(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    return new Date(year, month - 1, index + 1, 12);
  });
}

export function formatMonthTitle(monthValue: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthValue}-01T12:00:00`));
}

export function formatDay(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date);
}

export function formatChartDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatLongDay(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function getNotePreview(note: string, limit = 72) {
  if (note.length <= limit) return note;
  return `${note.slice(0, limit).trimEnd()}...`;
}

export function lightenHexColor(color: string, amount: number) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return color;

  const ratio = Math.max(0, Math.min(amount, 100)) / 100;
  const channels = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16);
    return Math.round(value + (255 - value) * ratio)
      .toString(16)
      .padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

export function getStats(state: TrackerState): TrackerStats {
  const habits = state.habits.filter((habit) => !habit.archived);
  const scores = Object.values(state.entries).map((entry) => entry.score);
  const todayKey = dateKey(new Date());
  const trackedDayKeys = [...new Set(Object.keys(state.entries).map((key) => key.slice(0, 10)))]
    .filter((day) => day <= todayKey)
    .sort();
  const trackedDays = trackedDayKeys.length;
  const total = scores.length;

  const trackedDaySet = new Set(trackedDayKeys);
  let currentStreak = 0;
  const cursor = parseDateKey(todayKey);

  while (trackedDaySet.has(dateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let bestStreak = 0;
  let streak = 0;
  let previousDay: string | null = null;

  trackedDayKeys.forEach((day) => {
    if (!previousDay) {
      streak = 1;
    } else {
      const nextExpectedDay = shiftDate(previousDay, 1);
      streak = nextExpectedDay === day ? streak + 1 : 1;
    }

    previousDay = day;
    bestStreak = Math.max(bestStreak, streak);
  });

  return { habitCount: habits.length, total, trackedDays, currentStreak, bestStreak };
}

export function formatSubskillCount(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} упражнение`;
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return `${count} упражнения`;
  }
  return `${count} упражнений`;
}

export function getActiveHabits(habits: Habit[]) {
  return habits.filter((habit) => !habit.archived);
}

export function getChildrenByParent(habits: Habit[]) {
  const activeHabits = habits.filter((habit) => !habit.archived);
  const childrenByParent = new Map<string, Habit[]>();

  activeHabits.forEach((habit) => {
    if (!habit.parentId) return;
    const siblings = childrenByParent.get(habit.parentId) ?? [];
    siblings.push(habit);
    childrenByParent.set(habit.parentId, siblings);
  });

  return childrenByParent;
}

export function getVisibleHabitRows(
  habits: Habit[],
  expandedProjects: Set<string>,
): HabitRow[] {
  const activeHabits = getActiveHabits(habits);
  const childrenByParent = getChildrenByParent(habits);

  return activeHabits.flatMap((habit) => {
    if (habit.parentId) return [];

    const projectRow: HabitRow = {
      ...habit,
      depth: 0,
      childCount: childrenByParent.get(habit.id)?.length ?? 0,
    };
    const childRows = expandedProjects.has(habit.id)
      ? (childrenByParent.get(habit.id) ?? []).map((child) => ({
          ...child,
          depth: 1,
          childCount: 0,
        }))
      : [];

    return [projectRow, ...childRows];
  });
}

export function getChartPoints(
  state: TrackerState,
  habitId: string,
  range: ChartRange,
) {
  const allEntries = Object.values(state.entries)
    .filter((entry) => entry.habitId === habitId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (range === "all") return allEntries;

  const days = range === "week" ? 7 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  const startKey = dateKey(startDate);

  return allEntries.filter((entry) => entry.date >= startKey);
}

export function getExpandedProjectsFromState(state: TrackerState) {
  const projectIdsWithChildren = new Set(
    state.habits
      .filter((habit) => !habit.archived && habit.parentId)
      .map((habit) => habit.parentId!),
  );

  return new Set(
    (state.preferences?.expandedProjectIds ?? []).filter((projectId) =>
      projectIdsWithChildren.has(projectId),
    ),
  );
}
