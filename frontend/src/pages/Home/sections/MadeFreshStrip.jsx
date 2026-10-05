import { Link } from 'react-router-dom';

export function MadeFreshStrip() {
  return (
    <section className="w-full bg-[#f7bb0e] border-y-2 border-[#283618] my-8 lg:my-12">
      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-5 sm:py-6 flex items-center justify-between gap-4">
        <p
          className="font-display text-[#283618] text-[20px] sm:text-[22px] lg:text-[26px] leading-[1.05] font-extrabold select-none"
          style={{ fontStretch: '112%' }}
        >
          Made fresh every morning.
        </p>
        <Link
          to="/collections"
          className="ak-btn ak-btn--dark shrink-0 hover:bg-[#1f2b13] transition-colors"
        >
          Shop now
        </Link>
      </div>
    </section>
  );
}
