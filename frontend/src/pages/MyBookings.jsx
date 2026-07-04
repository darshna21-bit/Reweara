import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, cancelBooking } from '../api/bookings';

/**
 * MyBookings Page Component
 * Showcases customer booking history with status badges, thumbnail cards,
 * inline action feedback banners, and an on-brand terracotta cancellation modal overlay.
 */
export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action status/feedback states
  const [activeCancelBooking, setActiveCancelBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellingIds, setCancellingIds] = useState({});
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyBookings();
      if (res && res.success && Array.isArray(res.data.bookings)) {
        setBookings(res.data.bookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      // Mask database/network errors from customer UI
      if (err.response && err.response.status === 404) {
        setError(err.response.data?.message || 'Bookings history not found.');
      } else {
        setError('Something went wrong loading your bookings. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Login Guard redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: location } });
    }
  }, [user, authLoading, navigate, location]);

  // Fetch bookings on mount if user is present
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/premium_lehenga_rental.png';
  };

  const handleCancelClick = (booking) => {
    setActiveCancelBooking(booking);
    setCancellationReason('');
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!activeCancelBooking) return;

    const trimmedReason = cancellationReason.trim();
    if (trimmedReason.length < 5) return;

    const targetBookingId = activeCancelBooking.bookingId;

    // Set individual loading state
    setCancellingIds(prev => ({ ...prev, [targetBookingId]: true }));
    setActiveCancelBooking(null); // Close modal immediately

    try {
      const res = await cancelBooking(targetBookingId, trimmedReason);
      if (res && res.success && res.data?.booking) {
        const updatedBooking = res.data.booking;
        setBookings(prev => 
          prev.map(b => b.bookingId === targetBookingId ? updatedBooking : b)
        );
        
        if (updatedBooking.paymentStatus === 'refund_failed') {
          setActionSuccess(`Booking ${targetBookingId} was cancelled. There was an issue processing your refund automatically — our team will process it manually within 24 hours.`);
        } else {
          setActionSuccess(`Booking ${targetBookingId} has been successfully cancelled.`);
        }
        setActionError(null);
        // Clear success message after 5 seconds
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        throw new Error('Cancellation rejected by backend.');
      }
    } catch (err) {
      console.error(`Error cancelling booking ${targetBookingId}:`, err);
      // Mask database/network errors
      if (err.response && err.response.status < 500) {
        setActionError(err.response.data?.message || 'Cancellation request rejected.');
      } else {
        setActionError('Cancellation failed. Please check your connection and try again.');
      }
      setActionSuccess(null);
      // Clear error message after 5 seconds
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setCancellingIds(prev => ({ ...prev, [targetBookingId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    let label = status;
    let classes = 'bg-brand-cream text-brand-espresso border border-brand-dust/20';

    switch (status) {
      case 'pending':
        label = 'Pending Hold';
        classes = 'bg-amber-50 text-amber-800 border border-amber-200/50';
        break;
      case 'confirmed':
        label = 'Confirmed';
        classes = 'bg-brand-blush/20 text-brand-espresso border border-brand-blush/40 font-medium';
        break;
      case 'active':
        label = 'Active Rental';
        classes = 'bg-brand-espresso text-brand-cream border border-brand-espresso';
        break;
      case 'completed':
        label = 'Completed';
        classes = 'bg-brand-cream text-brand-dust border border-brand-dust/20';
        break;
      case 'cancelled':
        label = 'Cancelled';
        classes = 'bg-red-50 text-red-700 border border-red-200/50';
        break;
      default:
        break;
    }

    return (
      <span className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-widest font-semibold ${classes}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (authLoading || (user && isLoading && bookings.length === 0 && !error)) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest text-brand-dust font-light">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <>
      {/* On-Brand Terracotta Cancel Booking Modal Overlay */}
      {activeCancelBooking && (
        <div className="fixed inset-0 bg-brand-espresso/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-luxury border border-brand-dust/15 shadow-xl animate-fade-in space-y-6">
            
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Cancel Reservation</span>
              <h3 className="font-serif text-2xl text-brand-espresso">Confirm Cancellation</h3>
              <p className="text-xs text-brand-dust font-light leading-relaxed">
                Cancel your booking for <span className="font-semibold text-brand-espresso">{activeCancelBooking.outfit?.title || 'Garment'}</span> ({formatDate(activeCancelBooking.startDate)} to {formatDate(activeCancelBooking.endDate)})?
              </p>
            </div>

            {/* Permanent Destruction Warning callout in Luxury Terracotta */}
            <div className="bg-[#8D4237]/10 border border-[#8D4237]/20 p-3.5 rounded-soft text-xs text-[#8D4237] font-medium leading-relaxed">
              ⚠️ This cancellation is permanent and cannot be undone.
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Reason for Cancellation</label>
                <textarea
                  required
                  rows="3"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please tell us why you need to cancel this booking (minimum 5 characters)..."
                  className="w-full bg-brand-cream border border-brand-dust/20 focus:border-brand-espresso rounded-soft p-3 text-xs font-light outline-none resize-none transition-colors duration-300"
                />
                {cancellationReason.trim().length > 0 && cancellationReason.trim().length < 5 && (
                  <p className="text-[10px] text-[#8D4237] font-medium animate-fade-in">
                    * Reason must be at least 5 characters long (currently {cancellationReason.trim().length}/5).
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCancelBooking(null)}
                  className="border border-brand-dust/20 text-brand-dust hover:text-brand-espresso hover:border-brand-espresso px-4 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
                >
                  Never Mind
                </button>
                <button
                  type="submit"
                  disabled={cancellationReason.trim().length < 5}
                  className="bg-[#8D4237] hover:bg-[#78362D] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#8D4237] text-white px-5 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      <div className="min-h-screen bg-brand-cream text-brand-espresso flex flex-col justify-between animate-fade-in relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 py-12 w-full flex-1 space-y-8">
        
        {/* Navigation Breadcrumbs */}
        <nav className="text-xs uppercase tracking-widest text-brand-dust">
          <Link to="/" className="hover:text-brand-espresso transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-espresso font-medium">My Bookings</span>
        </nav>

        {/* Page Header */}
        <header className="border-b border-brand-dust/10 pb-6">
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight">
            My Bookings
          </h1>
          <p className="text-[10px] text-brand-dust mt-1 font-light uppercase tracking-widest">
            View and manage your exclusive rentals history
          </p>
        </header>

        {/* Action Success/Error Banners */}
        {actionSuccess && (
          <div className="bg-green-50 border border-green-200/50 text-green-800 p-4 rounded-luxury text-xs animate-fade-in flex items-center justify-between shadow-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-green-800/60 hover:text-green-800 font-bold ml-2 text-sm">×</button>
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 border border-red-200/50 text-red-800 p-4 rounded-luxury text-xs animate-fade-in flex items-center justify-between shadow-sm">
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-800/60 hover:text-red-800 font-bold ml-2 text-sm">×</button>
          </div>
        )}

        {/* Main Error State */}
        {error && (
          <div className="bg-white rounded-luxury border border-red-200/50 p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm animate-fade-in">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-serif text-lg text-brand-espresso">Unable to Load Bookings</h3>
            <p className="text-xs text-brand-dust leading-relaxed">{error}</p>
            <div className="pt-2">
              <button 
                onClick={fetchBookings}
                className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && bookings.length === 0 && (
          <div className="bg-white rounded-luxury border border-brand-dust/15 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm animate-fade-in">
            <span className="text-3xl">👗</span>
            <h3 className="font-serif text-lg">No Bookings Yet</h3>
            <p className="text-xs text-brand-dust leading-relaxed">
              You haven't booked anything yet. Explore our curated collections to find your perfect style.
            </p>
            <div className="pt-2">
              <Link 
                to="/outfits"
                className="inline-block bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300"
              >
                Browse Our Collection
              </Link>
            </div>
          </div>
        )}

        {/* Loaded Bookings List */}
        {!error && bookings.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {bookings.map((booking) => {
              const outfit = booking.outfit || {};
              const showCancelBtn = ['pending', 'confirmed'].includes(booking.bookingStatus);
              const isCancelling = cancellingIds[booking.bookingId];

              // Date calculations for cancellation eligibility
              const now = new Date();
              const createdAtDate = new Date(booking.createdAt);
              const startDateDate = new Date(booking.startDate);

              const timeSinceCreation = now.getTime() - createdAtDate.getTime();
              const timeToStart = startDateDate.getTime() - now.getTime();
              const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
              const fifteenMinsInMs = 15 * 60 * 1000;

              const isWithinGracePeriod = timeSinceCreation <= fifteenMinsInMs;
              const isWithinThreeDays = timeToStart < threeDaysInMs;
              const isConfirmed = booking.bookingStatus === 'confirmed';
              const isEligibleToCancel = !isConfirmed || isWithinGracePeriod || !isWithinThreeDays;

              return (
                <div 
                  key={booking._id} 
                  className="bg-white p-5 rounded-luxury border border-brand-dust/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between animate-fade-in"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-20 bg-brand-cream rounded overflow-hidden flex-shrink-0 border border-brand-dust/10">
                      <img 
                        src={outfit.thumbnail || '/premium_lehenga_rental.png'} 
                        alt={outfit.title || 'Outfit'} 
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-serif text-base text-brand-espresso leading-tight">
                        {outfit.title || 'Exclusive Garment'}
                      </h3>
                      <p className="text-xs text-brand-dust font-light">
                        Booking ID: <span className="font-medium text-brand-espresso">{booking.bookingId}</span>
                      </p>
                      <p className="text-[11px] text-brand-dust font-light leading-none">
                        Rental Period: <span className="font-semibold text-brand-espresso">{formatDate(booking.startDate)}</span> to <span className="font-semibold text-brand-espresso">{formatDate(booking.endDate)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Price, Status & Actions */}
                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-brand-cream gap-4">
                    <div className="sm:text-right space-y-0.5">
                      <span className="text-[9px] text-brand-dust uppercase tracking-wider block">Total Rent Paid</span>
                      <span className="text-base font-bold text-brand-espresso">
                        ₹{booking.totalRentAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(booking.bookingStatus)}
                      {showCancelBtn && (
                        isEligibleToCancel ? (
                          <button 
                            onClick={() => handleCancelClick(booking)}
                            disabled={isCancelling}
                            className="border border-brand-dust/20 hover:border-brand-espresso text-brand-espresso disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
                          >
                            {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
                          </button>
                        ) : (
                          <span 
                            className="text-[9px] text-[#8D4237] font-semibold uppercase tracking-wider bg-[#8D4237]/5 px-2.5 py-1.5 rounded border border-[#8D4237]/15 select-none cursor-not-allowed animate-fade-in" 
                            title="Cancellation window closed (within 3 days of rental start)"
                          >
                            Cancellation Closed
                          </span>
                        )
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-brand-dust/10 py-12 px-4 mt-12">
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
  </>
);
}
