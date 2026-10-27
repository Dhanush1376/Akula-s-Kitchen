/**
 * Brand-story band. The three promises come straight from the logo's ring:
 * FRESH • TASTY • HEALTHY.
 */
const PROMISES = [
  {
    word: 'Fresh',
    line: 'Idli, dosa, vada and appam batters, ground in small batches.',
  },
  {
    word: 'Tasty',
    line: 'Avakaaya, gongura and lemon pickles made the traditional way.',
  },
  {
    word: 'Healthy',
    line: 'Ragi and foxtail murukulu, amla pickles and honest podis.',
  },
];

export function FreshEveryDay() {
  return (
    <section className="ak-fresh" aria-labelledby="ak-fresh-title">
      <div className="ak-fresh__inner">
        <div className="ak-fresh__copy">
          <h2 id="ak-fresh-title" className="ak-fresh__title">
            Fresh every day
          </h2>
          <ul className="ak-fresh__list">
            {PROMISES.map((p) => (
              <li key={p.word}>
                <span className="ak-fresh__word">{p.word}</span>
                <span className="ak-fresh__line">{p.line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
