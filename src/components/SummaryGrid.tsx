import type { TrackerStats } from "../lib/tracker";

type SummaryGridProps = {
  stats: TrackerStats;
};

export function SummaryGrid({ stats }: SummaryGridProps) {
  return (
    <section className="summary-grid" aria-label="Статистика">
      <article>
        <span>Навыков</span>
        <strong>{stats.habitCount}</strong>
      </article>
      <article>
        <span>Текущая серия</span>
        <strong>{stats.currentStreak}</strong>
        <small>Лучшая серия: {stats.bestStreak}</small>
      </article>
      <article>
        <span>Дней с отметками</span>
        <strong>{stats.trackedDays}</strong>
      </article>
    </section>
  );
}
