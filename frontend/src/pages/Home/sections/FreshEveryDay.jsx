import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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
          <Link
            to="/collections"
            className="inline-flex items-center gap-3.5 bg-[#283618] text-white pl-5 sm:pl-6 pr-1.5 py-1.5 min-h-[46px] rounded-full shadow-md hover:bg-[#1f2b13] transition-all duration-200 group select-none self-start active:translate-y-px"
            style={{ fontFamily: 'var(--font-display, inherit)' }}
          >
            <span className="font-extrabold text-[14px] tracking-wide text-white">
              Shop the kitchen
            </span>
            <span className="w-[34px] h-[34px] rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <ArrowUpRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.5}
              />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
