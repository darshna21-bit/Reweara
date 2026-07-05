import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Outfit Card Component
 * Optimized for luxury editorial look, aspect-square image crop,
 * and responsive stacked-pricing grids. Wraps in React Router Link for routing.
 * 
 * @param {Object} props
 * @param {Object} props.outfit - Outfit dataset containing title, description, category, rentPrice, refundableDeposit, thumbnail, slug
 */
export default function OutfitCard({ outfit }) {
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/premium_lehenga_rental.png';
  };

  return (
    <Link to={`/outfits/${outfit.slug || outfit._id}`} className="group block h-full">
      <article className="group flex flex-col bg-white rounded-luxury border border-brand-dust/15 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full">
        {/* Image Block */}
        <div className="relative aspect-square bg-brand-cream overflow-hidden">
          <img 
            src={outfit.thumbnail} 
            alt={outfit.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={handleImageError}
          />
          <span className="absolute top-4 left-4 text-[10px] uppercase tracking-widest bg-brand-cream/95 text-brand-espresso px-2.5 py-1.5 rounded shadow-sm font-semibold border border-brand-dust/10">
            {outfit.category}
          </span>
        </div>

        {/* Details Block */}
        <div className="p-3 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-serif text-sm sm:text-base tracking-tight leading-snug group-hover:text-brand-dust transition-colors duration-300 text-brand-espresso">
              {outfit.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-brand-dust font-light leading-relaxed line-clamp-2">
              {outfit.description}
            </p>
          </div>

          {/* Financials & Action */}
          <div className="space-y-3 pt-2 border-t border-brand-cream">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1.5 sm:gap-0">
              <div>
                <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Rental Price</span>
                <span className="text-sm sm:text-base font-semibold text-brand-espresso">
                  ₹{outfit.rentPrice.toLocaleString('en-IN')}
                  <span className="text-[10px] font-light text-brand-dust"> / day</span>
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Deposit (Refundable)</span>
                <span className="text-xs sm:text-sm font-medium text-brand-espresso block">
                  ₹{outfit.refundableDeposit.toLocaleString('en-IN')}
                </span>
                <span className="text-[8px] text-[#8D4237] block mt-0.5 font-light leading-none">
                  (not charged yet)
                </span>
              </div>
            </div>

            {/* Styled div instead of button to maintain HTML5 compliance when nested inside Link anchor */}
            <div className="w-full bg-brand-espresso text-brand-cream text-center hover:bg-brand-dust py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 block">
              Reserve Outfit
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
