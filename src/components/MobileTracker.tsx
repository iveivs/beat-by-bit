import { useState, type FormEvent, type MouseEvent } from "react";
import { makeEntryKey, type Habit, type Score, type TrackerState } from "../storage";
import {
  dateKey,
  formatDay,
  formatLongDay,
  formatSubskillCount,
  formatWeekday,
  getNotePreview,
  isFutureDay,
  scoreColors,
} from "../lib/tracker";

type MobileTrackerProps = {
  calendarAnchorDate: string;
  childrenByParent: Map<string, Habit[]>;
  dayNotes: Record<string, string>;
  entryNotes: Record<string, string>;
  entries: TrackerState["entries"];
  expandedProjects: Set<string>;
  mobileDates: Date[];
  newArea: string;
  newHabit: string;
  onAddHabit: (event: FormEvent<HTMLFormElement>) => void;
  onAddSubSkill: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
  onEditHabit: (habit: Habit) => void;
  onOpenChart: (habit: Habit) => void;
  onOpenDayNoteEditor: (
    event: MouseEvent<HTMLButtonElement>,
    date: string,
  ) => void;
  onOpenEntryNoteEditor: (
    event: MouseEvent<HTMLButtonElement>,
    habitId: string,
    habitName: string,
    date: string,
  ) => void;
  onOpenMonthOverview: () => void;
  onNewAreaChange: (value: string) => void;
  onNewHabitChange: (value: string) => void;
  onNextDay: () => void;
  onPreviousDay: () => void;
  onSelectDate: (date: string) => void;
  onSetScore: (habitId: string, date: string, score: Score | null) => void;
  onToday: () => void;
  onTogglePicker: (
    event: MouseEvent<HTMLButtonElement>,
    key: string,
    habitId: string,
    habitName: string,
    date: string,
  ) => void;
  onToggleProject: (projectId: string) => void;
  rootHabits: Habit[];
  todayKey: string;
};

export function MobileTracker({
  calendarAnchorDate,
  childrenByParent,
  dayNotes,
  entryNotes,
  entries,
  expandedProjects,
  mobileDates,
  newArea,
  newHabit,
  onAddHabit,
  onAddSubSkill,
  onDeleteHabit,
  onEditHabit,
  onOpenChart,
  onOpenDayNoteEditor,
  onOpenEntryNoteEditor,
  onOpenMonthOverview,
  onNewAreaChange,
  onNewHabitChange,
  onNextDay,
  onPreviousDay,
  onSelectDate,
  onSetScore,
  onToday,
  onTogglePicker,
  onToggleProject,
  rootHabits,
  todayKey,
}: MobileTrackerProps) {
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const selectedDate = calendarAnchorDate;
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
  const selectedDayNote = dayNotes[selectedDate];
  const selectedDayIsFuture = isFutureDay(selectedDate, todayKey);

  function toggleHabit(habit: Habit, hasChildren: boolean, isExpanded: boolean) {
    setActiveHabitId((currentHabitId) => (currentHabitId === habit.id ? null : habit.id));
    if (hasChildren && !isExpanded) {
      onToggleProject(habit.id);
    }
  }

  return (
    <section className="mobile-tracker" aria-label="Навыки по дням">
      <div className="mobile-date-panel" aria-label="Выбранный день">
        <div className="mobile-date-nav">
          <button
            className="calendar-nav-button"
            type="button"
            aria-label="Предыдущий день"
            onClick={onPreviousDay}
          >
            ‹
          </button>
          <div className="mobile-date-title">
            <strong>{formatLongDay(selectedDate)}</strong>
            <span>{selectedDayIsFuture ? "Можно добавить заметку" : "День для отметок"}</span>
          </div>
          <button
            className="calendar-nav-button"
            type="button"
            aria-label="Следующий день"
            onClick={onNextDay}
          >
            ›
          </button>
        </div>

        <div className="mobile-date-actions">
          <button className="secondary-button compact-button" type="button" onClick={onToday}>
            Сегодня
          </button>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onOpenMonthOverview}
          >
            Весь месяц
          </button>
        </div>

        <div className="mobile-date-strip" aria-label="Ближайшие дни">
          {mobileDates.map((date) => {
            const day = dateKey(date);
            const note = dayNotes[day];
            const dayEntries = Object.values(entries).filter((entry) => entry.date === day);
            const hasEntries = dayEntries.length > 0;

            return (
              <button
                className={`mobile-date-chip ${day === todayKey ? "current" : ""} ${
                  day === selectedDate ? "active" : ""
                } ${note ? "has-note" : ""}`}
                key={day}
                type="button"
                aria-label={`${formatLongDay(day)}. ${
                  hasEntries ? "Есть отметки" : "Нет отметок"
                }${note ? ". Есть заметка" : ""}`}
                onClick={() => onSelectDate(day)}
              >
                <span>{formatWeekday(date)}</span>
                <strong>{formatDay(date)}</strong>
                <em
                  className={`mobile-day-status ${hasEntries ? "complete" : "empty"}`}
                  aria-hidden="true"
                >
                  {hasEntries ? "✓" : ""}
                </em>
                {note ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <button
          className={`mobile-selected-note ${selectedDayNote ? "has-note" : ""}`}
          type="button"
          onClick={(event) => onOpenDayNoteEditor(event, selectedDate)}
        >
          <span className="day-note-glyph" aria-hidden="true">
            ✎
          </span>
          <span>
            {selectedDayNote ? getNotePreview(selectedDayNote, 72) : "Добавить заметку дня"}
          </span>
        </button>
      </div>

      <div className={`mobile-add-panel ${isAddOpen ? "open" : ""}`}>
        <button
          className="primary-button mobile-add-toggle"
          type="button"
          onClick={() => setIsAddOpen((isOpen) => !isOpen)}
        >
          {isAddOpen ? "Скрыть добавление" : "+ Добавить"}
        </button>
        {isAddOpen ? (
          <form
            className="habit-form mobile-habit-form"
            onSubmit={(event) => {
              onAddHabit(event);
              setIsAddOpen(false);
            }}
          >
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
        ) : null}
      </div>

      {rootHabits.map((habit) => {
        const children = childrenByParent.get(habit.id) ?? [];
        const isExpanded = expandedProjects.has(habit.id);
        const isActive = activeHabitId === habit.id;
        const selectedEntryKey = makeEntryKey(habit.id, selectedDate);
        const selectedEntry = entries[selectedEntryKey];
        const selectedEntryNote = entryNotes[selectedEntryKey];

        return (
          <article className={`mobile-skill-card ${isActive ? "active" : ""}`} key={habit.id}>
            <button
              className="mobile-skill-header"
              type="button"
              aria-expanded={isExpanded}
              onClick={() => toggleHabit(habit, Boolean(children.length), isExpanded)}
            >
              <span
                className="habit-mark"
                style={{ backgroundColor: habit.color }}
              />
              <span className="mobile-skill-copy">
                <strong>{habit.name}</strong>
                <span>
                  {children.length
                    ? `${habit.area} · ${formatSubskillCount(children.length)}`
                    : habit.area}
                </span>
              </span>
              <span className="mobile-expand-indicator" aria-hidden="true">
                {isActive ? "⌄" : "›"}
              </span>
            </button>

            {isActive ? (
              <div className="mobile-skill-details">
                <div className="mobile-selected-score">
                  <div className="mobile-selected-score-copy">
                    <span>Оценка за {formatDay(selectedDateObject)}</span>
                    <strong>
                      {selectedDayIsFuture
                        ? "Будущий день"
                        : selectedEntry?.score
                          ? selectedEntry.score
                          : "Пока пусто"}
                    </strong>
                  </div>
                  {!selectedDayIsFuture ? (
                    <button
                      className={`score-cell ${selectedEntryNote ? "has-entry-note" : ""}`}
                      style={{
                        backgroundColor: selectedEntry
                          ? scoreColors[selectedEntry.score]
                          : "transparent",
                      }}
                      type="button"
                      aria-label={`${habit.name}, ${formatLongDay(selectedDate)}`}
                      onClick={(event) =>
                        onTogglePicker(
                          event,
                          selectedEntryKey,
                          habit.id,
                          habit.name,
                          selectedDate,
                        )
                      }
                    >
                      {selectedEntry?.score ?? ""}
                      {selectedEntryNote ? (
                        <span className="score-note-marker" aria-hidden="true" />
                      ) : null}
                    </button>
                  ) : null}
                </div>

                {!selectedDayIsFuture ? (
                  <div className="mobile-score-row">
                    {([1, 2, 3, 4, 5] as Score[]).map((score) => (
                      <button
                        className="mobile-score-button"
                        key={score}
                        style={{ backgroundColor: scoreColors[score] }}
                        type="button"
                        aria-label={`${habit.name}, оценка ${score}`}
                        onClick={() => onSetScore(habit.id, selectedDate, score)}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mobile-skill-actions">
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={(event) =>
                      onOpenEntryNoteEditor(event, habit.id, habit.name, selectedDate)
                    }
                  >
                    Заметка
                  </button>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => onOpenChart(habit)}
                  >
                    График
                  </button>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => onEditHabit(habit)}
                  >
                    Настройки
                  </button>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => onAddSubSkill(habit)}
                  >
                    Упражнение
                  </button>
                  <button
                    className="archive-button mobile-delete-button"
                    type="button"
                    aria-label={`Удалить ${habit.name}`}
                    onClick={() => onDeleteHabit(habit)}
                  >
                    ×
                  </button>
                </div>

                {children.length && isExpanded ? (
                  <div className="mobile-exercise-list">
                    {children.map((rowHabit) => (
                      <div className="mobile-day-row child" key={rowHabit.id}>
                        <div className="mobile-child-title">
                          <span
                            className="habit-mark"
                            style={{ backgroundColor: rowHabit.color }}
                          />
                          <strong>{rowHabit.name}</strong>
                          <button
                            className="chart-button"
                            type="button"
                            aria-label={`Открыть диаграмму ${rowHabit.name}`}
                            onClick={() => onOpenChart(rowHabit)}
                          >
                            ▥
                          </button>
                          <button
                            className="edit-button"
                            type="button"
                            aria-label={`Редактировать ${rowHabit.name}`}
                            onClick={() => onEditHabit(rowHabit)}
                          >
                            ⚙
                          </button>
                        </div>
                        <div className="mobile-days">
                          {mobileDates.map((date) => {
                            const day = dateKey(date);
                            const key = makeEntryKey(rowHabit.id, day);
                            const entry = entries[key];
                            const entryNote = entryNotes[key];
                            return (
                              <div
                                className={day === selectedDate ? "mobile-day today" : "mobile-day"}
                                key={key}
                              >
                                <span>
                                  {formatWeekday(date)}
                                  <strong>{formatDay(date)}</strong>
                                </span>
                                <button
                                  className={`score-cell ${entryNote ? "has-entry-note" : ""}`}
                                  style={{
                                    backgroundColor: entry
                                      ? scoreColors[entry.score]
                                      : "transparent",
                                  }}
                                  type="button"
                                  aria-label={`${rowHabit.name}, ${formatDay(date)}`}
                                  title={
                                    entryNote
                                      ? `${rowHabit.name} · ${formatDay(date)}\n${getNotePreview(entryNote, 90)}`
                                      : `${rowHabit.name}, ${formatDay(date)}`
                                  }
                                  onClick={(event) =>
                                    onTogglePicker(
                                      event,
                                      key,
                                      rowHabit.id,
                                      rowHabit.name,
                                      day,
                                    )
                                  }
                                >
                                  {entry?.score ?? ""}
                                  {entryNote ? (
                                    <span className="score-note-marker" aria-hidden="true" />
                                  ) : null}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
