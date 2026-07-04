import React, { useState, useEffect } from 'react';
import { getOutfits } from '../api/outfits';
import OutfitCard from '../components/OutfitCard';

/**
 * OutfitListing Catalog Browse Component
 * Fetches real-time outfit details from backend and showcases them
 * inside our approved compact design grid system.
 */
export default function OutfitListing() {
  const [outfits, setOutfits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCatalog = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOutfits();
      // Inspecting exact shape: res.data.outfits holds the array
      if (res && res.data && Array.isArray(res.data.outfits)) {
        setOutfits(res.data.outfits);
      } else {
        setOutfits([]);
      }
    } catch (err) {
      console.error('Error fetching catalog outfits:', err);
      if (err.response && err.response.status === 404) {
        setError(err.response.data?.message || 'The requested catalog could not be found.');
      } else {
        setError('Something went wrong loading our collection. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-espresso flex flex-col justify-between animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-12 w-full flex-1 space-y-8">
        
        {/* Page Title & Breadcrumbs */}
        <header className="border-b border-brand-dust/10 pb-6 text-center md:text-left">
          <span className="text-xs uppercase tracking-[0.2em] text-brand-dust font-medium block mb-1">
            ReWeara Catalog
          </span>
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight">
            Browse Our Collection
          </h1>
        </header>

        {/* 1. Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
            <p className="text-sm text-brand-dust font-light tracking-wide">Loading exclusive outfits...</p>
          </div>
        )}

        {/* 2. Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-luxury border border-red-200/50 p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-serif text-lg text-brand-espresso">Catalog Unavailable</h3>
            <p className="text-xs text-brand-dust leading-relaxed">{error}</p>
            <button 
              onClick={fetchCatalog}
              className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!isLoading && !error && outfits.length === 0 && (
          <div className="bg-white rounded-luxury border border-brand-dust/15 p-12 text-center max-w-lg mx-auto space-y-4">
            <span className="text-3xl">👗</span>
            <h3 className="font-serif text-lg">No Outfits Found</h3>
            <p className="text-xs text-brand-dust leading-relaxed">
              We are currently preparing our exclusive garments collection. Please check back shortly.
            </p>
          </div>
        )}

        {/* 4. Loaded Grid Layout */}
        {!isLoading && !error && outfits.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {outfits.map((outfit) => (
              <OutfitCard key={outfit._id} outfit={outfit} />
            ))}
          </div>
        )}

      </div>

      {/* Footer */}
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
