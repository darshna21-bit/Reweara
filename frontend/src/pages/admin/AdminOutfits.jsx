import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminOutfits, deleteOutfit } from '../../api/outfits';

/**
 * AdminOutfits Management Component
 * Displays a utilitarian, dense table layout showcasing all catalog outfits,
 * regardless of their current status (available, maintenance, damaged, retired, inactive).
 */
export default function AdminOutfits() {
  const [outfits, setOutfits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Deactivation states
  const [outfitToDeactivate, setOutfitToDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);

  const handleDeactivateClick = (outfit) => {
    setOutfitToDeactivate(outfit);
    setDeactivateError(null);
  };

  const handleDeactivateConfirm = async () => {
    if (!outfitToDeactivate) return;
    setIsDeactivating(true);
    setDeactivateError(null);
    try {
      await deleteOutfit(outfitToDeactivate._id);
      // Update local state in-place by setting status of the deactivated outfit to 'inactive'
      setOutfits((prevOutfits) =>
        prevOutfits.map((outfit) =>
          outfit._id === outfitToDeactivate._id ? { ...outfit, status: 'inactive' } : outfit
        )
      );
      setOutfitToDeactivate(null);
    } catch (err) {
      console.error('Error deactivating outfit:', err);
      setDeactivateError(
        err.response?.data?.message || 'Deactivation request failed. Please check your connection.'
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  const fetchOutfits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminOutfits();
      if (res && res.success && Array.isArray(res.data?.outfits)) {
        setOutfits(res.data.outfits);
      } else {
        setOutfits([]);
      }
    } catch (err) {
      console.error('Error fetching admin outfits:', err);
      if (err.response && err.response.status === 404) {
        setError(err.response.data?.message || 'The administrative outfits catalog endpoint could not be found.');
      } else {
        setError('Failed to load catalog outfits. Please verify your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutfits();
  }, []);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/premium_lehenga_rental.png';
  };

  // Maps outfit status to clear, premium badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case 'damaged':
        return 'bg-rose-50 text-rose-700 border-rose-200/60';
      case 'retired':
        return 'bg-zinc-100 text-zinc-600 border-zinc-300/60';
      case 'inactive':
        return 'bg-gray-50 text-gray-500 border-gray-200/60';
      default:
        return 'bg-brand-cream text-brand-espresso border-brand-dust/10';
    }
  };

  return (
    <>
      {/* Deactivate Outfit Confirmation Modal Overlay */}
      {outfitToDeactivate && (
        <div className="fixed inset-0 bg-brand-espresso/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-luxury border border-brand-dust/15 shadow-xl animate-fade-in space-y-6">
            
            <div className="space-y-2 text-brand-espresso">
              <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Deactivate Catalog Item</span>
              <h3 className="font-serif text-2xl">Deactivate Outfit</h3>
              <p className="text-xs text-brand-dust font-light leading-relaxed">
                Are you sure you want to deactivate <span className="font-semibold text-brand-espresso">{outfitToDeactivate.title}</span>?
              </p>
            </div>

            {/* Warning callout in Terracotta */}
            <div className="bg-[#8D4237]/10 border border-[#8D4237]/20 p-3.5 rounded-soft text-xs text-[#8D4237] font-medium leading-relaxed">
              This outfit will be marked inactive and hidden from customers, but its data and booking history will be preserved. You can reactivate it later via Edit.
            </div>

            {deactivateError && (
              <p className="text-xs text-[#8D4237] font-medium leading-normal animate-fade-in">
                ⚠️ {deactivateError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeactivating}
                onClick={() => setOutfitToDeactivate(null)}
                className="border border-brand-dust/20 text-brand-dust hover:text-brand-espresso hover:border-brand-espresso px-4 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
              >
                Never Mind
              </button>
              <button
                type="button"
                disabled={isDeactivating}
                onClick={handleDeactivateConfirm}
                className="bg-[#8D4237] hover:bg-[#78362D] text-white disabled:opacity-50 px-5 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm cursor-pointer"
              >
                {isDeactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="space-y-6 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-dust/10 pb-5">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-dust font-semibold block mb-0.5">
            Catalog Management
          </span>
          <h1 className="text-2xl md:text-3xl font-serif tracking-tight text-brand-espresso">
            Outfits Inventory
          </h1>
        </div>
        <div>
          <Link
            to="/admin/outfits/new"
            className="inline-flex items-center justify-center bg-brand-espresso text-brand-cream hover:bg-brand-dust px-4 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm hover:shadow"
          >
            + Add New Outfit
          </Link>
        </div>
      </div>

      {/* 1. Loading State */}
      {isLoading && (
        <div className="bg-white rounded-soft border border-brand-dust/10 p-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
          <p className="text-xs text-brand-dust font-light tracking-wider">Loading complete inventory list...</p>
        </div>
      )}

      {/* 2. Error State */}
      {error && !isLoading && (
        <div className="bg-white rounded-soft border border-red-100 p-10 text-center max-w-xl mx-auto space-y-4 shadow-sm my-8">
          <span className="text-xl">⚠️</span>
          <h3 className="font-serif text-base text-brand-espresso">Inventory Load Failure</h3>
          <p className="text-xs text-brand-dust leading-relaxed">{error}</p>
          <button
            onClick={fetchOutfits}
            className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-5 py-2 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* 3. Loaded Table View */}
      {!isLoading && !error && (
        <div className="bg-white rounded-soft border border-brand-dust/10 shadow-sm overflow-hidden">
          {outfits.length === 0 ? (
            /* Empty State */
            <div className="p-16 text-center space-y-4">
              <span className="text-2xl block">👗</span>
              <h3 className="font-serif text-base text-brand-espresso">No outfits in catalog yet</h3>
              <p className="text-xs text-brand-dust max-w-sm mx-auto leading-relaxed">
                Start building your product database by adding your first designer garment.
              </p>
              <Link
                to="/admin/outfits/new"
                className="inline-block bg-brand-espresso hover:bg-brand-dust text-brand-cream px-4 py-2 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300"
              >
                Add Your First Outfit
              </Link>
            </div>
          ) : (
            /* Dense Table Layout */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-brand-cream/40 border-b border-brand-dust/10 text-brand-espresso font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-16">Thumbnail</th>
                    <th className="py-3 px-4">Title & ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Rent Price</th>
                    <th className="py-3 px-4 text-center">Status Badge</th>
                    <th className="py-3 px-4 text-center">Actions & Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dust/10 text-brand-espresso font-light">
                  {outfits.map((outfit) => (
                    <tr 
                      key={outfit._id} 
                      className="hover:bg-brand-cream/10 transition-colors duration-150"
                    >
                      {/* Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-brand-cream border border-brand-dust/10 flex-shrink-0">
                          <img
                            src={outfit.thumbnail}
                            alt={outfit.title}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        </div>
                      </td>

                      {/* Title & ID */}
                      <td className="py-3.5 px-4 font-normal">
                        <div className="font-serif text-sm text-brand-espresso font-medium">
                          {outfit.title}
                        </div>
                        <div className="text-[10px] text-brand-dust font-mono mt-0.5">
                          ID: {outfit._id}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-brand-espresso uppercase tracking-wider text-[10px] font-medium">
                        {outfit.category}
                      </td>

                      {/* Rent Price */}
                      <td className="py-3.5 px-4 text-right font-medium text-brand-espresso">
                        ₹{outfit.rentPrice?.toLocaleString('en-IN') || '0'}
                        <span className="text-[9px] text-brand-dust font-light"> / day</span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(outfit.status)}`}>
                          {outfit.status}
                        </span>
                      </td>

                      {/* Actions & Indicator */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          <Link
                            to={`/admin/outfits/${outfit._id}/edit`}
                            className="inline-block border border-brand-espresso/20 hover:border-brand-espresso text-brand-espresso py-1 px-2.5 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200"
                          >
                            Edit
                          </Link>
                          {outfit.status !== 'inactive' ? (
                            <button
                              onClick={() => handleDeactivateClick(outfit)}
                              className="inline-block border border-red-200 hover:border-[#8D4237] text-[#8D4237] hover:bg-red-50/20 py-1 px-2.5 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider text-brand-dust font-normal">
                              ({outfit.status})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  </>
);
}
