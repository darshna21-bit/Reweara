import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOutfits } from '../api/outfits';
import OutfitCard from '../components/OutfitCard';

/**
 * Home Page Page Component
 * Renders the premium editorial hero statement, featured collection grid,
 * and minimalist clean footer links.
 */
export default function Home() {
  const [outfits, setOutfits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeatured = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOutfits();
      if (res && res.data && Array.isArray(res.data.outfits)) {
        // Show max 4 outfits in featured section
        setOutfits(res.data.outfits.slice(0, 4));
      }
    } catch (err) {
      console.error('Error fetching featured outfits:', err);
      if (err.response && err.response.status === 404) {
        setError(err.response.data?.message || 'Featured outfits not found.');
      } else {
        setError('Something went wrong loading our featured collection. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-espresso flex flex-col justify-between animate-fade-in">
      
      {/* 1. Hero Editorial Section */}
      <section className="px-4 py-20 md:py-32 text-center max-w-4xl mx-auto space-y-6">
        <span className="text-xs uppercase tracking-[0.3em] text-brand-dust font-semibold block">
          The Outfit Baar
        </span>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif tracking-tight leading-none">
          ReWeara
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-brand-dust max-w-xl mx-auto font-light leading-relaxed">
          Rent premium festive wear, pay transparent refundable deposits, and enjoy same-day dry-cleaned deliveries. Proudly serving Pune first.
        </p>
        <div className="pt-4">
          <Link to="/outfits" className="inline-block bg-brand-espresso text-brand-cream hover:bg-brand-dust px-8 py-3.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-[1px]">
            Browse Collection
          </Link>
        </div>
      </section>

      {/* 2. Featured Outfits Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 pb-24 w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-brand-dust/10 pb-4 text-center md:text-left gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-brand-dust font-medium block mb-1">
              Curated Selections
            </span>
            <h2 className="text-2xl md:text-3xl font-serif">
              Featured Outfits
            </h2>
          </div>
          <div className="pt-2 md:pt-0">
            <Link 
              to="/outfits" 
              className="text-brand-espresso font-medium hover:underline hover:text-brand-dust transition-colors text-xs uppercase tracking-widest inline-flex items-center gap-1.5"
            >
              View All Outfits <span className="text-sm font-normal">→</span>
            </Link>
          </div>
        </div>

        {/* 2.1 Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-8 h-8 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
            <p className="text-sm text-brand-dust font-light tracking-wide">Loading featured selection...</p>
          </div>
        )}

        {/* 2.2 Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-luxury border border-red-200/50 p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm animate-fade-in">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-serif text-lg text-brand-espresso">Featured Outfits Unavailable</h3>
            <p className="text-xs text-brand-dust leading-relaxed">{error}</p>
            <div className="pt-2">
              <button 
                onClick={fetchFeatured}
                className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* 2.3 Empty State Fallback */}
        {!isLoading && !error && outfits.length === 0 && (
          <div className="bg-white rounded-luxury border border-brand-dust/15 p-12 text-center max-w-lg mx-auto space-y-4">
            <span className="text-3xl">👗</span>
            <h3 className="font-serif text-lg">No Outfits Found</h3>
            <p className="text-xs text-brand-dust leading-relaxed">
              Check back soon for our latest collection.
            </p>
          </div>
        )}

        {/* 2.4 Loaded Real Grid (2-column mobile, 3-column tablet, 4-column desktop) */}
        {!isLoading && !error && outfits.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {outfits.map((outfit) => (
              <OutfitCard key={outfit._id} outfit={outfit} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Minimalist Footer */}
      <footer className="bg-white border-t border-brand-dust/10 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-brand-dust">
          <div className="font-serif text-lg text-brand-espresso tracking-tight">
            ReWeara
          </div>
          <div className="flex gap-6 uppercase tracking-wider font-light">
            <a href="#about" className="hover:text-brand-espresso transition-colors duration-300">About</a>
            <a href="#contact" className="hover:text-brand-espresso transition-colors duration-300">Contact</a>
            <a href="#policies" className="hover:text-brand-espresso transition-colors duration-300">Policies</a>
          </div>
          <div>
            © 2026 ReWeara. Designed for modern luxury.
          </div>
        </div>
      </footer>

    </div>
  );
}
