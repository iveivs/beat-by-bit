import { type CSSProperties, type FormEvent, type MouseEvent } from "react";
import { makeEntryKey, type Habit } from "../storage";
import {
  calendarPeriodLabels,
  dateKey,
  formatDay,
  formatLongDay,
  getNotePreview,
  formatSubskillCount,
  formatWeekday,
  longHabitNameLimit,
  scoreColors,
  type CalendarPeriod,
  type HabitRow,
} from "../lib/tracker";

type TrackerBandProps = {
  dates: Date[];
  monthValue: string;
  periodDays: CalendarPeriod;
  rangeLabel: string;
  dayNotes: Record<string, string>;
  entryNotes: Record<string, string>;
  entries: Record<string, { habitId: string; date: string; score: 1 | 2 | 3 | 4 | 5 }>;
  expandedProjects: Set<string>;
  newArea: string;
  newHabit: string;
  onAddHabit: (event: FormEvent<HTMLFormElement>) => void;
  onAddSubSkill: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
  onEditHabit: (habit: Habit) => void;
  onNewAreaChange: (value: string) => void;
  onNewHabitChange: (value: string) => void;
  onOpenChart: (habit: Habit) => void;
  onOpenDayNoteEditor: (
    event: MouseEvent<HTMLButtonElement>,
    date: string,
  ) => void;
  onMonthChange: (value: string) => void;
  onOpenMonthOverview: () => void;
  onPeriodChange: (value: string) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onOpenFullHabitName: (habit: Habit) => void;
  onToday: () => void;
  onTogglePicker: (
    event: MouseEvent<HTMLButtonElement>,
    key: string,
    habitId: string,
    habitName: string,
    date: string,
  ) => void;
  onToggleProject: (projectId: string) => void;
  todayKey: string;
  visibleHabits: HabitRow[];
};

export function TrackerBand({
  dates,
  monthValue,
  periodDays,
  rangeLabel,
  dayNotes,
  entryNotes,
  entries,
  expandedProjects,
  newArea,
  newHabit,
  onAddHabit,
  onAddSubSkill,
  onDeleteHabit,
  onEditHabit,
  onNewAreaChange,
  onNewHabitChange,
  onOpenChart,
  onOpenDayNoteEditor,
  onMonthChange,
  onOpenMonthOverview,
  onPeriodChange,
  onPreviousPeriod,
  onNextPeriod,
  onOpenFullHabitName,
  onToday,
  onTogglePicker,
  onToggleProject,
  todayKey,
  visibleHabits,
}: TrackerBandProps) {
  return (
    <section className="tracker-band">
      <div className="toolbar">
        <div className="calendar-toolbar" aria-label="Навигация по датам">
          <div className="calendar-range-group">
            <button type="button" className="calendar-nav-button" onClick={onPreviousPeriod}>
              ‹
            </button>
            <div className="calendar-range-copy">
              <strong>{rangeLabel}</strong>
              <span>Окно календаря</span>
            </div>
            <button type="button" className="calendar-nav-button" onClick={onNextPeriod}>
              ›
            </button>
            <button type="button" className="secondary-button calendar-today-button" onClick={onToday}>
              Сегодня
            </button>
          </div>

          <div className="calendar-filters">
            <button
              type="button"
              className="secondary-button calendar-overview-button"
              onClick={onOpenMonthOverview}
            >
              Весь месяц
            </button>
            <label className="calendar-field">
              <span>Месяц</span>
              <input type="month" value={monthValue} onChange={(event) => onMonthChange(event.target.value)} />
            </label>
            <label className="calendar-field">
              <span>Период</span>
              <select
                value={periodDays}
                onChange={(event) => onPeriodChange(event.target.value)}
              >
                {Object.entries(calendarPeriodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <form className="habit-form" onSubmit={onAddHabit}>
          <input
            aria-label="Название навыка"
            placeholder="Новый раздел или упражнение"
            value={newHabit}
            onChange={(event) => onNewHabitChange(event.target.value)}
          />
          <input
            aria-label="Категория"
            placeholder="Категория"
            value={newArea}
            onChange={(event) => onNewAreaChange(event.target.value)}
          />
          <button type="submit">Добавить</button>
        </form>
      </div>

      <div className="table-wrap">
        <table
          className="tracker-table"
          style={{ minWidth: `${310 + dates.length * 72 + 54}px` }}
        >
          <colgroup>
            <col className="habit-column" />
            {dates.map((date) => (
              <col className="day-column" key={dateKey(date)} />
            ))}
            <col className="actions-column" />
          </colgroup>
          <thead>
            <tr>
              <th className="habit-heading">Раздел / упражнение</th>
              {dates.map((date) => {
                const day = dateKey(date);
                const note = dayNotes[day];
                return (
                  <th
                    key={day}
                    className={day === todayKey ? "today-column" : ""}
                  >
                    <div className="day-heading">
                      <span>{formatWeekday(date)}</span>
                      <strong>{formatDay(date)}</strong>
                      <button
                        className={`day-note-button ${note ? "has-note" : ""}`}
                        type="button"
                        title={note ? note : `Добавить заметку на ${formatLongDay(day)}`}
                        aria-label={
                          note
                            ? `Открыть заметку на ${formatLongDay(day)}`
                            : `Добавить заметку на ${formatLongDay(day)}`
                        }
                        onClick={(event) => onOpenDayNoteEditor(event, day)}
                      >
                        <span className="day-note-glyph" aria-hidden="true">
                          ✎
                        </span>
                        {note ? (
                          <span className="day-note-badge" aria-hidden="true" />
                        ) : null}
                      </button>
                    </div>
                  </th>
                );
              })}
              <th className="actions-heading"> </th>
            </tr>
          </thead>
          <tbody>
            {visibleHabits.map((habit) => (
              <tr
                key={habit.id}
                className={habit.depth ? "subskill-row" : "project-row"}
              >
                <th
                  className="habit-cell"
                  style={{ "--depth": habit.depth } as CSSProperties}
                >
                  <div className="habit-cell-content">
                    <span
                      className="habit-mark"
                      style={{ backgroundColor: habit.color }}
                    />
                    <div className="habit-copy">
                      <div className="habit-title-row">
                        {!habit.parentId && habit.childCount ? (
                          <button
                            className="expand-button"
                            type="button"
                            aria-label={
                              expandedProjects.has(habit.id)
                                ? `Свернуть упражнения ${habit.name}`
                                : `Раскрыть упражнения ${habit.name}`
                            }
                            aria-expanded={expandedProjects.has(habit.id)}
                            onClick={() => onToggleProject(habit.id)}
                          >
                            {expandedProjects.has(habit.id) ? "⌄" : "›"}
                          </button>
                        ) : null}
                        <strong className="habit-title">{habit.name}</strong>
                        {habit.name.length > longHabitNameLimit ? (
                          <button
                            className="more-name-button"
                            type="button"
                            aria-label={`Показать полное название ${habit.name}`}
                            onClick={() => onOpenFullHabitName(habit)}
                          >
                            ...
                          </button>
                        ) : null}
                        <button
                          className="chart-button"
                          type="button"
                          aria-label={`Открыть диаграмму ${habit.name}`}
                          onClick={() => onOpenChart(habit)}
                        >
                          ▥
                        </button>
                        <button
                          className="edit-button"
                          type="button"
                          aria-label={`Редактировать ${habit.name}`}
                          onClick={() => onEditHabit(habit)}
                        >
                          ⚙
                        </button>
                        {!habit.parentId ? (
                          <button
                            className="add-subskill-button"
                            type="button"
                            aria-label={`Добавить упражнение в ${habit.name}`}
                            onClick={() => onAddSubSkill(habit)}
                          >
                            +
                          </button>
                        ) : null}
                      </div>
                      <span>
                        {habit.parentId
                          ? habit.area
                          : habit.childCount
                            ? `${habit.area} · ${formatSubskillCount(habit.childCount)}`
                            : habit.area}
                      </span>
                    </div>
                  </div>
                </th>
                {dates.map((date) => {
                  const day = dateKey(date);
                  const key = makeEntryKey(habit.id, day);
                  const entry = entries[key];
                  const entryNote = entryNotes[key];

                  return (
                    <td key={key} className={day === todayKey ? "today-column" : ""}>
                      <button
                        className={`score-cell ${entryNote ? "has-entry-note" : ""}`}
                        data-today={day === todayKey ? "true" : undefined}
                        style={{
                          backgroundColor: entry
                            ? scoreColors[entry.score]
                            : "transparent",
                        }}
                        type="button"
                        aria-label={`${habit.name}, ${formatDay(date)}`}
                        title={
                          entryNote
                            ? `${habit.name} · ${formatLongDay(day)}\n${getNotePreview(entryNote, 90)}`
                            : `${habit.name}, ${formatLongDay(day)}`
                        }
                        onClick={(event) =>
                          onTogglePicker(event, key, habit.id, habit.name, day)
                        }
                      >
                        {entry?.score ?? ""}
                        {entryNote ? <span className="score-note-marker" aria-hidden="true" /> : null}
                      </button>
                    </td>
                  );
                })}
                <td>
                  <button
                    className="archive-button"
                    type="button"
                    aria-label={`Удалить ${habit.name}`}
                    onClick={() => onDeleteHabit(habit)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
