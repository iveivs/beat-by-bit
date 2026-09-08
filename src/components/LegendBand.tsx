import { scoreColors, scoreLabels } from "../lib/tracker";
import type { Score } from "../storage";

export function LegendBand() {
  return (
    <section className="notes-band">
      <div>
        <h2>Ритм складывается по частям</h2>
        <p>
          Beat by Bit помогает вести дневник занятий, отмечать упражнения и
          замечать прогресс по дням. Регулярные записи показывают, что уже
          звучит уверенно, а чему стоит уделить внимание на следующей практике.
        </p>
      </div>
      <div className="legend" aria-label="Цвета оценок">
        {[1, 2, 3, 4, 5].map((score) => (
          <span key={score}>
            <i style={{ backgroundColor: scoreColors[score as Score] }} />
            {score} - {scoreLabels[score as Score]}
          </span>
        ))}
      </div>
    </section>
  );
}
