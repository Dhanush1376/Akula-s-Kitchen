import React from 'react';
import { ShopHeroLeaf } from './ShopHeroLeaf';

export const ProductListingHeader = ({ searchParam, shopContent }) => {
  const hero = shopContent?.hero || {};
  const title = searchParam ? 'Search' : hero.title || 'Shop';
  const description = searchParam
    ? `Showing results for "${searchParam}"`
    : hero.description || 'Batters, chutneys, pickles, podis and more, made fresh in our kitchen.';

  return (
    <section
      className="ak-shop-head"
      style={{ paddingTop: 'calc(var(--ak-header-h, 72px) + 20px)' }}
    >
      <ShopHeroLeaf />
      <div className="ak-shop-head__inner">
        <div className="ak-shop-head__text">
          {hero.subtitle && !searchParam && <p className="ak-shop-head__kicker">{hero.subtitle}</p>}
          <h1 className="ak-shop-head__title">{title}</h1>
          <p className="ak-shop-head__desc">{description}</p>
        </div>
      </div>
    </section>
  );
};
