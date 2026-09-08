import { useState, type FormEvent, type ReactNode } from "react";
import {
  chartRanges,
  chartViews,
  dayNoteLimit,
  formatChartDate,
  formatLongDay,
  formatMonthTitle,
  isFutureDay,
  scoreColors,
  scoreLabels,
  type AuthMode,
  type ChartRange,
  type ChartView,
  type NoteEditorState,
  type PickerState,
} from "../lib/tracker";
import { makeEntryKey, type Habit, type Score } from "../storage";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ModalShell({
  ariaLabel,
  children,
  onClose,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop">
      <button
        className="dialog-scrim"
        type="button"
        aria-label={ariaLabel}
        onClick={onClose}
      />
      {children}
    </div>
  );
}

type ScorePopoverProps = {
  hasEntryNote: boolean;
  onOpenEntryNote: (habitId: string, habitName: string, date: string) => void;
  onSetScore: (habitId: string, date: string, score: Score | null) => void;
  picker: PickerState | null;
  todayKey: string;
};

export function ScorePopover({
  hasEntryNote,
  onOpenEntryNote,
  onSetScore,
  picker,
  todayKey,
}: ScorePopoverProps) {
  if (!picker) return null;

  const futureDay = isFutureDay(picker.date, todayKey);

  return (
    <div
      className="score-popover"
      role="menu"
      style={{ left: picker.left, top: picker.top }}
    >
      {!futureDay
        ? ([1, 2, 3, 4, 5] as Score[]).map((score) => (
            <button
              key={score}
              type="button"
              style={{ backgroundColor: scoreColors[score] }}
              onClick={() => onSetScore(picker.habitId, picker.date, score)}
            >
              <strong>{score}</strong>
              <span>{scoreLabels[score]}</span>
            </button>
          ))
        : null}
      <button
        className="note-popover-action"
        type="button"
        onClick={() => onOpenEntryNote(picker.habitId, picker.habitName, picker.date)}
      >
        {hasEntryNote ? "Изменить заметку ячейки" : "Добавить заметку к ячейке"}
      </button>
      {!futureDay ? (
        <button
          className="clear-score"
          type="button"
          onClick={() => onSetScore(picker.habitId, picker.date, null)}
        >
          Очистить
        </button>
      ) : null}
    </div>
  );
}

type DayNoteEditorProps = {
  canDelete: boolean;
  draft: string;
  editor: NoteEditorState | null;
  onChangeDraft: (value: string) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
};

export function DayNoteEditor({
  canDelete,
  draft,
  editor,
  onChangeDraft,
  onClose,
  onDelete,
  onSave,
}: DayNoteEditorProps) {
  if (!editor) return null;

  return (
    <div
      className="day-note-editor"
      role="dialog"
      aria-modal="false"
      aria-labelledby="day-note-title"
      style={{ left: editor.left, top: editor.top }}
    >
      <div className="day-note-editor-head">
        <div>
          <strong id="day-note-title">
            {editor.type === "entry" ? "Заметка к ячейке" : "Заметка на день"}
          </strong>
          <span>
            {formatLongDay(editor.date)}
            {editor.type === "entry" ? ` · ${editor.habitName}` : ""}
          </span>
        </div>
        <button
          className="archive-button"
          type="button"
          aria-label="Закрыть заметку"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <label className="day-note-field">
        <span className="sr-only">Текст заметки</span>
        <textarea
          maxLength={dayNoteLimit}
          placeholder={
            editor.type === "entry"
              ? "Коротко зафиксируй, что именно происходило в этой ячейке"
              : "Коротко зафиксируй мысль, событие или контекст этого дня"
          }
          value={draft}
          onChange={(event) => onChangeDraft(event.target.value)}
        />
      </label>
      <div className="day-note-editor-meta">
        <span>
          {draft.length} / {dayNoteLimit}
        </span>
      </div>
      <div className="day-note-editor-actions">
        {canDelete ? (
          <button
            className="ghost-button note-delete-button"
            type="button"
            onClick={onDelete}
          >
            Удалить
          </button>
        ) : (
          <span className="day-note-editor-spacer" aria-hidden="true" />
        )}
        <div className="day-note-editor-buttons">
          <button className="secondary-button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" type="button" onClick={onSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

type DeleteHabitDialogProps = {
  habit: Habit | null;
  hasChildren: boolean;
  onClose: () => void;
  onConfirm: (habitId: string) => void;
};

export function DeleteHabitDialog({
  habit,
  hasChildren,
  onClose,
  onConfirm,
}: DeleteHabitDialogProps) {
  if (!habit) return null;

  return (
    <ModalShell ariaLabel="Закрыть подтверждение удаления" onClose={onClose}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-habit-title"
      >
        <h2 id="delete-habit-title">Удалить навык?</h2>
        <p>
          Строка «{habit.name}»
          {hasChildren ? " вместе с упражнениями" : ""} и все её оценки исчезнут из
          таблицы. Это действие нельзя будет отменить.
        </p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => onConfirm(habit.id)}
          >
            Удалить
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

type AddSubSkillDialogProps = {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  parent: Habit | null;
  value: string;
  onChange: (value: string) => void;
};

export function AddSubSkillDialog({
  onChange,
  onClose,
  onSubmit,
  parent,
  value,
}: AddSubSkillDialogProps) {
  if (!parent) return null;

  return (
    <ModalShell ariaLabel="Закрыть добавление упражнения" onClose={onClose}>
      <form
        className="confirm-dialog edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-subskill-title"
        onSubmit={onSubmit}
      >
        <h2 id="new-subskill-title">Добавить упражнение</h2>
        <p className="dialog-context">{parent.name}</p>
        <label>
          <span>Название</span>
          <input
            maxLength={120}
            placeholder="Например, игра с метрономом"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Добавить
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

type EditHabitDialogProps = {
  area: string;
  habit: Habit | null;
  name: string;
  onAreaChange: (value: string) => void;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function EditHabitDialog({
  area,
  habit,
  name,
  onAreaChange,
  onClose,
  onNameChange,
  onSubmit,
}: EditHabitDialogProps) {
  if (!habit) return null;

  return (
    <ModalShell ariaLabel="Закрыть редактирование навыка" onClose={onClose}>
      <form
        className="confirm-dialog edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-habit-title"
        onSubmit={onSubmit}
      >
        <h2 id="edit-habit-title">Редактировать навык</h2>
        <label>
          <span>Название</span>
          <input maxLength={120} value={name} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label>
          <span>Категория</span>
          <input maxLength={48} value={area} onChange={(event) => onAreaChange(event.target.value)} />
        </label>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Сохранить
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

type FullNameDialogProps = {
  habit: Habit | null;
  onClose: () => void;
};

export function FullNameDialog({ habit, onClose }: FullNameDialogProps) {
  if (!habit) return null;

  return (
    <ModalShell ariaLabel="Закрыть полное название" onClose={onClose}>
      <div
        className="confirm-dialog full-name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-habit-title"
      >
        <h2 id="full-habit-title">Полное название</h2>
        <p>{habit.name}</p>
        <div className="dialog-actions">
          <button className="primary-button" type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

type ProfileDialogProps = {
  draft: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onResetClick: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  userName: string | null;
};

export function ProfileDialog({
  draft,
  onChange,
  onClose,
  onResetClick,
  onSubmit,
  open,
  userName,
}: ProfileDialogProps) {
  if (!open) return null;

  return (
    <ModalShell ariaLabel="Закрыть профиль" onClose={onClose}>
      <form
        className="confirm-dialog edit-dialog profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        onSubmit={onSubmit}
      >
        <h2 id="profile-title">Профиль</h2>
        <p className="dialog-context">{userName ?? "Аккаунт Firebase"}</p>
        <label>
          <span>Никнейм</span>
          <input
            maxLength={40}
            placeholder="Как показывать тебя в приложении"
            value={draft}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <p className="profile-hint">
          Никнейм виден только внутри Beat by Bit. Если оставить поле пустым, будет
          показан email или имя из аккаунта.
        </p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Сохранить
          </button>
        </div>
        <div className="profile-danger-zone">
          <div>
            <strong>Начать с чистого листа</strong>
            <span>Удалить разделы, упражнения, оценки и заметки.</span>
          </div>
          <button className="danger-outline-button" type="button" onClick={onResetClick}>
            Стереть все данные
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

type ResetDataDialogProps = {
  busy: boolean;
  confirmation: string;
  message: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
};

export function ResetDataDialog({
  busy,
  confirmation,
  message,
  onChange,
  onClose,
  onSubmit,
  open,
}: ResetDataDialogProps) {
  if (!open) return null;

  const confirmationPhrase = "СТЕРЕТЬ ВСЁ";
  const canReset = confirmation.trim() === confirmationPhrase && !busy;

  return (
    <ModalShell ariaLabel="Закрыть подтверждение очистки" onClose={onClose}>
      <form
        className="confirm-dialog edit-dialog reset-data-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-data-title"
        onSubmit={onSubmit}
      >
        <h2 id="reset-data-title">Стереть все данные?</h2>
        <p>
          Разделы, упражнения, оценки и заметки будут удалены на всех устройствах.
          Аккаунт останется доступен. Отменить это действие нельзя.
        </p>
        <label>
          <span>
            Напиши <strong>{confirmationPhrase}</strong>
          </span>
          <input
            autoComplete="off"
            placeholder={confirmationPhrase}
            value={confirmation}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        {message ? (
          <p className="reset-data-message" role="status">
            {message}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button className="danger-button" type="submit" disabled={!canReset}>
            {busy ? "Удаляю..." : "Стереть всё"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

type ChartPoint = {
  date: string;
  score: Score;
};

type MonthOverviewDialogProps = {
  dates: Date[];
  dayNotes: Record<string, string>;
  entryNotes: Record<string, string>;
  entries: Record<string, { habitId: string; date: string; score: Score }>;
  habits: Habit[];
  monthValue: string | null;
  onClose: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

type MonthOverviewMode = "primary" | "all";

type ChartDialogProps = {
  average: string;
  bestScore: number;
  habit: Habit | null;
  points: ChartPoint[];
  range: ChartRange;
  scoreBreakdown: Array<{ score: Score; count: number }>;
  total: number;
  view: ChartView;
  onClose: () => void;
  onRangeChange: (range: ChartRange) => void;
  onViewChange: (view: ChartView) => void;
};

export function ChartDialog({
  average,
  bestScore,
  habit,
  points,
  range,
  scoreBreakdown,
  total,
  view,
  onClose,
  onRangeChange,
  onViewChange,
}: ChartDialogProps) {
  if (!habit) return null;

  return (
    <ModalShell ariaLabel="Закрыть диаграмму" onClose={onClose}>
      <div
        className="confirm-dialog chart-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-title"
      >
        <div className="chart-head">
          <div>
            <p className="eyebrow">Прогресс упражнения</p>
            <h2 id="chart-title">{habit.name}</h2>
          </div>
          <button
            className="archive-button"
            type="button"
            aria-label="Закрыть диаграмму"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="range-tabs" role="tablist" aria-label="Период">
          {(Object.keys(chartRanges) as ChartRange[]).map((nextRange) => (
            <button
              className={range === nextRange ? "active" : ""}
              key={nextRange}
              type="button"
              role="tab"
              aria-selected={range === nextRange}
              onClick={() => onRangeChange(nextRange)}
            >
              {chartRanges[nextRange]}
            </button>
          ))}
        </div>
        <div className="chart-view-tabs" role="tablist" aria-label="Вид диаграммы">
          {(Object.keys(chartViews) as ChartView[]).map((nextView) => (
            <button
              className={view === nextView ? "active" : ""}
              key={nextView}
              type="button"
              role="tab"
              aria-selected={view === nextView}
              onClick={() => onViewChange(nextView)}
            >
              {chartViews[nextView]}
            </button>
          ))}
        </div>
        <div className="chart-stats" aria-label="Статистика диаграммы">
          <span>
            Отметок <strong>{points.length}</strong>
          </span>
          <span>
            Средняя <strong>{average}</strong>
          </span>
          <span>
            Лучшая <strong>{bestScore || "-"}</strong>
          </span>
        </div>
        {points.length ? (
          view === "donut" ? (
            <div className="donut-chart-layout">
              <div className="donut-chart-wrap" aria-hidden="true">
                <svg className="donut-chart" viewBox="0 0 120 120" role="presentation">
                  <circle
                    className="donut-chart-base"
                    cx="60"
                    cy="60"
                    r="42"
                    pathLength="100"
                  />
                  {scoreBreakdown.map((item, index) => {
                    if (!total || item.count === 0) return null;
                    const offset =
                      scoreBreakdown
                        .slice(0, index)
                        .reduce((sum, part) => sum + part.count, 0) / total;
                    return (
                      <circle
                        key={item.score}
                        className="donut-chart-segment"
                        cx="60"
                        cy="60"
                        r="42"
                        pathLength="100"
                        stroke={scoreColors[item.score]}
                        strokeDasharray={`${(item.count / total) * 100} 100`}
                        strokeDashoffset={`${25 - offset * 100}`}
                      />
                    );
                  })}
                </svg>
                <div className="donut-chart-center">
                  <strong>{average}</strong>
                  <span>средняя</span>
                </div>
              </div>
              <div className="donut-legend" aria-label="Распределение оценок">
                {scoreBreakdown.map((item) => (
                  <div className="donut-legend-row" key={item.score}>
                    <span className="donut-legend-main">
                      <i style={{ backgroundColor: scoreColors[item.score] }} />
                      {item.score} - {scoreLabels[item.score]}
                    </span>
                    <strong>
                      {item.count}
                      {total ? ` · ${Math.round((item.count / total) * 100)}%` : ""}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chart-scroll">
              <div className="chart-bars">
                {points.map((entry) => (
                  <div className="chart-bar-item" key={`${entry.date}-${entry.score}`}>
                    <div className="chart-bar-track">
                      <span
                        className="chart-bar"
                        style={{
                          height: `${entry.score * 20}%`,
                          backgroundColor: scoreColors[entry.score],
                        }}
                      />
                    </div>
                    <strong>{entry.score}</strong>
                    <span>{formatChartDate(entry.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="chart-empty">Пока нет оценок за выбранный период.</div>
        )}
      </div>
    </ModalShell>
  );
}

export function MonthOverviewDialog({
  dates,
  dayNotes,
  entryNotes,
  entries,
  habits,
  monthValue,
  onClose,
  onNextMonth,
  onPreviousMonth,
}: MonthOverviewDialogProps) {
  const [mode, setMode] = useState<MonthOverviewMode>("primary");
  if (!monthValue) return null;
  const activeMonthValue = monthValue;
  const activeMonthTitle = formatMonthTitle(activeMonthValue);
  const visibleHabits =
    mode === "primary" ? habits.filter((habit) => !habit.parentId) : habits;

  const monthNotes = dates
    .map((date) => {
      const day = date.toISOString().slice(0, 10);
      const note = dayNotes[day];
      return note ? { date: day, note } : null;
    })
    .filter(Boolean) as Array<{ date: string; note: string }>;

  const monthEntryNotes = visibleHabits
    .flatMap((habit) =>
      dates.map((date) => {
        const day = date.toISOString().slice(0, 10);
        const entryKey = makeEntryKey(habit.id, day);
        const note = entryNotes[entryKey];
        return note ? { key: entryKey, date: day, habitName: habit.name, note } : null;
      }),
    )
    .filter(Boolean) as Array<{
    key: string;
    date: string;
    habitName: string;
    note: string;
  }>;

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=1400,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    const headCells = dates
      .map((date) => {
        const day = date.toISOString().slice(0, 10);
        const marker = dayNotes[day] ? '<span class="note-marker">✎</span>' : "";
        return `<th><span class="day-number">${date.getDate()}</span>${marker}</th>`;
      })
      .join("");

    const rows = visibleHabits
      .map((habit) => {
        const scoreCells = dates
          .map((date) => {
            const day = date.toISOString().slice(0, 10);
            const entryKey = makeEntryKey(habit.id, day);
            const entry = entries[entryKey];
            const note = entryNotes[entryKey];
            const backgroundColor = entry ? scoreColors[entry.score] : "transparent";
            const content = entry?.score ?? "";
            const marker = note ? '<span class="cell-note-marker"></span>' : "";
            return `<td><span class="print-score-cell" style="background:${backgroundColor}">${content}${marker}</span></td>`;
          })
          .join("");

        return `
          <tr>
            <th class="habit-cell ${habit.parentId ? "child" : ""}">
              <div class="habit-line">
                <span class="habit-mark" style="background:${habit.color}"></span>
                <div class="habit-copy">
                  <strong>${escapeHtml(habit.name)}</strong>
                  <span>${escapeHtml(habit.area)}</span>
                </div>
              </div>
            </th>
            ${scoreCells}
          </tr>
        `;
      })
      .join("");

    const notesBlock = monthNotes.length
      ? `
        <section class="notes-page">
          <h2>Заметки по дням</h2>
          ${monthNotes
            .map(
              ({ date, note }) => `
                <article class="note-item">
                  <strong>${escapeHtml(formatLongDay(date))}</strong>
                  <p>${escapeHtml(note)}</p>
                </article>
              `,
            )
            .join("")}
        </section>
      `
      : "";

    const entryNotesBlock = monthEntryNotes.length
      ? `
        <section class="notes-page">
          <h2>Заметки к ячейкам</h2>
          ${monthEntryNotes
            .map(
              ({ date, habitName, note }) => `
                <article class="note-item">
                  <strong>${escapeHtml(`${habitName} · ${formatLongDay(date)}`)}</strong>
                  <p>${escapeHtml(note)}</p>
                </article>
              `,
            )
            .join("")}
        </section>
      `
      : "";

    printWindow.document.write(`<!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>Beat by Bit — ${escapeHtml(activeMonthTitle)}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #111;
              font-family: Inter, Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              width: 100%;
            }
            .sheet-head {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 5mm;
            }
            .sheet-head h1 {
              margin: 0;
              font-size: 16pt;
            }
            .sheet-head p {
              margin: 0;
              color: #444;
              font-size: 9pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #222;
              text-align: center;
              vertical-align: middle;
              padding: 0;
            }
            thead th {
              height: 10mm;
              font-size: 9pt;
              font-weight: 700;
              background: #fff;
            }
            thead th:first-child {
              width: 72mm;
            }
            .day-number {
              display: block;
              line-height: 1;
            }
            .note-marker {
              display: block;
              margin-top: 1mm;
              color: #444;
              font-size: 8pt;
              line-height: 1;
            }
            .habit-cell {
              width: 72mm;
              min-width: 72mm;
              padding: 2.2mm 2.8mm;
              text-align: left;
              background: #fff !important;
            }
            .habit-cell.child {
              padding-left: 6mm;
            }
            .habit-line {
              display: flex;
              align-items: center;
              gap: 3mm;
            }
            .habit-mark {
              width: 3.2mm;
              min-width: 3.2mm;
              height: 12mm;
              border-radius: 999px;
            }
            .habit-copy {
              display: grid;
              gap: 0.6mm;
            }
            .habit-copy strong {
              font-size: 10pt;
              line-height: 1.15;
            }
            .habit-copy span {
              color: #555;
              font-size: 8pt;
              line-height: 1.1;
            }
            td {
              width: 10mm;
              height: 10mm;
              font-size: 9pt;
              font-weight: 700;
            }
            .print-score-cell {
              position: relative;
              display: grid;
              place-items: center;
              width: 100%;
              height: 100%;
              color: #17221c;
            }
            .cell-note-marker {
              position: absolute;
              top: 1mm;
              right: 1mm;
              width: 2.1mm;
              height: 2.1mm;
              border-radius: 999px;
              background: #1f7a52;
              box-shadow: 0 0 0 0.3mm rgba(255, 255, 255, 0.9);
            }
            .notes-page {
              break-before: page;
              padding-top: 2mm;
            }
            .notes-page h2 {
              margin: 0 0 4mm;
              font-size: 14pt;
            }
            .note-item {
              margin-bottom: 3mm;
              padding: 3mm;
              border: 1px solid #999;
            }
            .note-item strong {
              display: block;
              margin-bottom: 1mm;
              font-size: 10pt;
            }
            .note-item p {
              margin: 0;
              font-size: 9pt;
              line-height: 1.45;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="sheet-head">
              <h1>${escapeHtml(activeMonthTitle)}</h1>
              <p>Beat by Bit</p>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Раздел / упражнение</th>
                  ${headCells}
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            ${notesBlock}
            ${entryNotesBlock}
          </main>
        </body>
      </html>`);

    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  return (
    <ModalShell ariaLabel="Закрыть обзор месяца" onClose={onClose}>
      <div
        className="confirm-dialog month-overview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-overview-title"
      >
        <div className="chart-head">
          <div>
            <p className="eyebrow">Месячный обзор</p>
            <div className="month-overview-title-row">
              <button
                className="calendar-nav-button"
                type="button"
                aria-label="Предыдущий месяц"
                onClick={onPreviousMonth}
              >
                ‹
              </button>
              <h2 id="month-overview-title">{formatMonthTitle(monthValue)}</h2>
              <button
                className="calendar-nav-button"
                type="button"
                aria-label="Следующий месяц"
                onClick={onNextMonth}
              >
                ›
              </button>
            </div>
          </div>
          <button
            className="archive-button"
            type="button"
            aria-label="Закрыть обзор месяца"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="month-overview-toolbar">
          <div className="month-overview-view-tabs" role="tablist" aria-label="Состав обзора">
            <button
              className={mode === "primary" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={mode === "primary"}
              onClick={() => setMode("primary")}
            >
              Основные
            </button>
            <button
              className={mode === "all" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={mode === "all"}
              onClick={() => setMode("all")}
            >
              Все
            </button>
          </div>

          <div className="month-overview-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={handlePrint}
            >
              Печать / PDF
            </button>
            <button className="primary-button" type="button" onClick={onClose}>
              Готово
            </button>
          </div>
        </div>

        <div className="month-overview-scroll">
          <table className="month-overview-table">
            <thead>
              <tr>
                <th>Раздел / упражнение</th>
                {dates.map((date) => {
                  const day = date.toISOString().slice(0, 10);
                  return (
                    <th key={day}>
                      <span>{date.getDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleHabits.map((habit) => (
                <tr key={habit.id}>
                  <th className={habit.parentId ? "month-habit-cell child" : "month-habit-cell"}>
                    <span
                      className="habit-mark"
                      style={{ backgroundColor: habit.color }}
                    />
                    <div className="month-habit-copy">
                      <strong>{habit.name}</strong>
                      <span>{habit.area}</span>
                    </div>
                  </th>
                  {dates.map((date) => {
                    const day = date.toISOString().slice(0, 10);
                    const entryKey = makeEntryKey(habit.id, day);
                    const entry = entries[entryKey];
                    return (
                      <td key={`${habit.id}-${day}`}>
                        <span
                          className={`month-score-cell ${entry ? "filled" : "empty"}`}
                          style={entry ? { backgroundColor: scoreColors[entry.score] } : undefined}
                          title={`${habit.name}, ${formatLongDay(day)}`}
                        >
                          {entry?.score ?? ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </ModalShell>
  );
}

type AuthDialogProps = {
  busy: boolean;
  email: string;
  message: string;
  mode: AuthMode | null;
  password: string;
  passwordRepeat: string;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangePasswordRepeat: (value: string) => void;
  onClose: () => void;
  onGoogleAuth: () => void;
  onPasswordReset: () => void;
  onSelectMode: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthDialog({
  busy,
  email,
  message,
  mode,
  password,
  passwordRepeat,
  onChangeEmail,
  onChangePassword,
  onChangePasswordRepeat,
  onClose,
  onGoogleAuth,
  onPasswordReset,
  onSelectMode,
  onSubmit,
}: AuthDialogProps) {
  if (!mode) return null;

  return (
    <ModalShell ariaLabel="Закрыть вход" onClose={onClose}>
      <form
        className="confirm-dialog auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onSubmit={onSubmit}
      >
        <h2 id="auth-title">Синхронизация</h2>
        <p>
          Email и пароль удобнее для телефона и встроенных браузеров. Google можно
          оставить как быстрый вход на компьютере.
        </p>
        <div className="auth-tabs" role="tablist" aria-label="Режим входа">
          <button
            className={mode === "signin" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => onSelectMode("signin")}
          >
            Вход
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => onSelectMode("signup")}
          >
            Регистрация
          </button>
        </div>
        <label>
          <span>Email</span>
          <input
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            type="email"
            value={email}
            onChange={(event) => onChangeEmail(event.target.value)}
          />
        </label>
        <label>
          <span>Пароль</span>
          <input
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            placeholder="Минимум 6 символов"
            type="password"
            value={password}
            onChange={(event) => onChangePassword(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <label>
            <span>Повтор пароля</span>
            <input
              autoComplete="new-password"
              minLength={6}
              placeholder="Повтори пароль"
              type="password"
              value={passwordRepeat}
              onChange={(event) => onChangePasswordRepeat(event.target.value)}
            />
          </label>
        ) : null}
        {message ? (
          <p className="auth-message" role="status">
            {message}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Подожди..." : mode === "signup" ? "Создать аккаунт" : "Войти"}
          </button>
        </div>
        <div className="auth-extra-actions">
          {mode === "signin" ? (
            <button type="button" onClick={onPasswordReset}>
              Сбросить пароль
            </button>
          ) : null}
          <button type="button" onClick={onGoogleAuth} disabled={busy}>
            Войти через Google
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
