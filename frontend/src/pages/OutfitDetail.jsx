import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getOutfitDetails } from '../api/outfits';
import { checkAvailability, createBookingOrder, verifyPayment } from '../api/bookings.js';
import { useAuth } from '../context/AuthContext.jsx';
import { loadRazorpayScript } from '../utils/razorpay.js';
import { useNavigate } from 'react-router-dom';

/**
 * OutfitDetail Product Page Component
 * Showcases detailed metadata, image grids/carousels, fabric details,
 * sizing measurements, and financial pricing breakdowns.
 */
export default function OutfitDetail() {
  const { slugOrId } = useParams();
  const location = useLocation();
  const [outfit, setOutfit] = useState(null);
  const [activeImage, setActiveImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Date selection & availability states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checking, setChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null); // null, or { available: boolean, message: string }
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');

  // Payment capture states
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [paymentFailedError, setPaymentFailedError] = useState(null);


  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOutfitDetails(slugOrId);
      if (res && res.data && res.data.outfit) {
        setOutfit(res.data.outfit);
        setActiveImage(res.data.outfit.thumbnail);
      } else {
        setError('No outfit details returned.');
      }
    } catch (err) {
      console.error('Error fetching outfit details:', err);
      if (err.response && err.response.status === 404) {
        setError(
          err.response.data?.message || 
          'The requested outfit could not be found.'
        );
      } else {
        setError('Something went wrong loading this page. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [slugOrId]);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/premium_lehenga_rental.png';
  };

  const handleThumbnailClick = (imgUrl) => {
    setActiveImage(imgUrl);
  };

  const handleCheckAvailability = async (e) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');
    setAvailabilityResult(null);

    // 1. Client-side validations
    if (!startDate || !endDate) {
      setValidationError('Both rental start and end dates are required.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      setValidationError('Rental start date cannot be scheduled in the past.');
      return;
    }

    if (end <= start) {
      setValidationError('Rental end date must occur strictly after the rental start date.');
      return;
    }

    setChecking(true);
    try {
      const res = await checkAvailability(outfit._id, startDate, endDate);
      if (res && res.success) {
        setAvailabilityResult({
          available: res.data.isAvailable,
          message: res.message
        });
      } else {
        setApiError('Received an unexpected response from the server.');
      }
    } catch (err) {
      console.error('Availability check error:', err);
      if (err.response && err.response.status < 500) {
        setApiError(err.response.data?.message || 'Failed to verify availability.');
      } else {
        setApiError('Failed to verify availability. Please check your connection and try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleProceedToBooking = async () => {
    if (!user) return;

    setValidationError('');
    setApiError('');
    setAvailabilityResult(null);
    setPaymentFailedError(null);
    setChecking(true);

    try {
      // 1. Load external Razorpay script dynamically
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment SDK. Please check your internet connection.');
      }

      // 2. Call backend create-order endpoint to reserve dates and construct Razorpay order
      const res = await createBookingOrder(outfit._id, startDate, endDate);
      if (res && res.success) {
        const { booking, razorpayOrder } = res.data;

        // 3. Configure the Razorpay payment modal options block
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'ReWeara',
          description: `Rent: ${outfit.title}`,
          order_id: razorpayOrder.id,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || ''
          },
          theme: {
            color: '#2B2321' // Warm Espresso matching brand identity
          },
          handler: async (response) => {
            setVerifyingPayment(true);
            try {
              const verifyRes = await verifyPayment(
                booking.bookingId,
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );

              if (verifyRes && verifyRes.success) {
                // Success: store booking details
                setBookingSuccessData(verifyRes.data.booking);
              } else {
                throw new Error('Verification failed. Server did not confirm booking.');
              }
            } catch (err) {
              console.error('❌ Payment verification failed:', err);
              if (err.response && err.response.status < 500) {
                setPaymentFailedError(err.response.data?.message || 'Payment verification failed.');
              } else {
                setPaymentFailedError('Payment verification failed. Please contact ReWeara support with your Order ID.');
              }
            }
          },
          modal: {
            ondismiss: () => {
              // Reset UI states cleanly so user is not stuck in a disabled/checking state
              setChecking(false);
              setVerifyingPayment(false);
            }
          }
        };

        // 4. Open Razorpay Checkout modal
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Received an unexpected response payload from order creation.');
      }
    } catch (err) {
      console.error('Booking order error:', err);
      if (err.response && err.response.status < 500) {
        setApiError(err.response.data?.message || 'Booking order initialization failed.');
      } else {
        setApiError('Booking initialization failed. Please check your connection and try again.');
      }
      setChecking(false);
    }
  };

  return (
    <>
      {/* Payment Verification & Confirmation Overlays */}
      {verifyingPayment && (
        <div className="fixed inset-0 bg-brand-cream/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-luxury border border-brand-dust/15 shadow-md text-center space-y-6 animate-fade-in">
            
            {/* Verifying Spinner State */}
            {!bookingSuccessData && !paymentFailedError && (
              <div className="space-y-4 py-8">
                <div className="w-10 h-10 border-3 border-brand-blush border-t-brand-espresso rounded-full animate-spin mx-auto"></div>
                <h3 className="font-serif text-lg text-brand-espresso">Verifying Payment</h3>
                <p className="text-xs text-brand-dust font-light leading-relaxed">
                  Securing your rental dates with the bank.<br />Please do not close this window or reload the page.
                </p>
              </div>
            )}

            {/* Celebratory Success State */}
            {bookingSuccessData && (
              <div className="space-y-6">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 text-2xl shadow-sm border border-green-200/20">
                  ✨
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Order Confirmed</span>
                  <h3 className="font-serif text-2xl text-brand-espresso">Booking Secured!</h3>
                </div>

                <div className="bg-brand-cream p-4 rounded-soft border border-brand-dust/10 text-left text-xs space-y-2.5 font-light">
                  <p>Booking ID: <span className="font-semibold text-brand-espresso">{bookingSuccessData.bookingId}</span></p>
                  <p>Garment: <span className="font-medium text-brand-espresso">{outfit.title}</span></p>
                  <p>Rental Period: <span className="font-medium text-brand-espresso">{new Date(bookingSuccessData.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to {new Date(bookingSuccessData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                  <p>Total Paid: <span className="font-semibold text-brand-espresso">₹{bookingSuccessData.totalRentAmount.toLocaleString('en-IN')}</span></p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-brand-cream">
                  <Link 
                    to="/my-bookings" 
                    className="inline-block bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 w-full block text-center"
                  >
                    View My Bookings
                  </Link>
                  <Link 
                    to="/outfits" 
                    className="inline-block border border-brand-espresso text-brand-espresso hover:bg-brand-cream px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 w-full block text-center"
                  >
                    Continue Browsing
                  </Link>
                </div>
              </div>
            )}

            {/* Failed Capture State */}
            {paymentFailedError && (
              <div className="space-y-6">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600 text-2xl shadow-sm border border-red-200/20">
                  ⚠️
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Verification Failed</span>
                  <h3 className="font-serif text-2xl text-brand-espresso">Checkout Collision</h3>
                </div>
                
                <p className="text-xs text-red-600 leading-relaxed bg-red-50 border border-red-100 p-3 rounded-soft">
                  {paymentFailedError}
                </p>

                <p className="text-[11px] text-brand-dust leading-normal font-light">
                  <strong>Important:</strong> If money was deducted from your account, please contact ReWeara customer support immediately at <span className="font-semibold text-brand-espresso">support@reweara.com</span> with your Booking ID so we can verify or refund your transaction.
                </p>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      setVerifyingPayment(false);
                      setPaymentFailedError(null);
                      setChecking(false);
                      setShowDatePicker(false);
                      setStartDate('');
                      setEndDate('');
                      setAvailabilityResult(null);
                    }}
                    className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 w-full cursor-pointer"
                  >
                    Back to Outfit Details
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <div className="min-h-screen bg-brand-cream text-brand-espresso flex flex-col justify-between animate-fade-in relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-12 w-full flex-1">
        
        {/* Navigation Breadcrumbs */}
        <nav className="mb-8 text-xs uppercase tracking-widest text-brand-dust">
          <Link to="/" className="hover:text-brand-espresso transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/outfits" className="hover:text-brand-espresso transition-colors">Catalog</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-espresso font-medium">{outfit?.title || 'Details'}</span>
        </nav>

        {/* 1. Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-8 h-8 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
            <p className="text-sm text-brand-dust font-light tracking-wide">Loading detailed metadata...</p>
          </div>
        )}

        {/* 2. Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-luxury border border-red-200/50 p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm animate-fade-in">
            <span className="text-2xl">
              {error.includes('Something went wrong') ? '⚠️' : '🔍'}
            </span>
            <h3 className="font-serif text-lg text-brand-espresso">
              {error.includes('Something went wrong') ? 'Service Unavailable' : 'Garment Not Found'}
            </h3>
            <p className="text-xs text-brand-dust leading-relaxed">{error}</p>
            <div className="flex justify-center gap-3 pt-2">
              {error.includes('Something went wrong') && (
                <button
                  onClick={fetchDetails}
                  className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 cursor-pointer"
                >
                  Retry
                </button>
              )}
              <Link 
                to="/outfits"
                className="inline-block border border-brand-espresso text-brand-espresso hover:bg-brand-cream px-6 py-2.5 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300"
              >
                Back to Catalog
              </Link>
            </div>
          </div>
        )}

        {/* 3. Detailed Loaded View */}
        {!isLoading && !error && outfit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white p-6 md:p-10 rounded-luxury border border-brand-dust/15 shadow-sm">
            
            {/* 3.1 Media Section (Image Preview & Gallery List) */}
            <div className="space-y-4">
              <div className="relative aspect-[4/5] bg-brand-cream overflow-hidden rounded-luxury border border-brand-dust/10">
                <img 
                  src={activeImage} 
                  alt={outfit.title} 
                  className="w-full h-full object-cover transition-all duration-500"
                  onError={handleImageError}
                />
                <span className="absolute top-4 left-4 text-[10px] uppercase tracking-widest bg-brand-cream/95 text-brand-espresso px-2.5 py-1.5 rounded shadow-sm font-semibold border border-brand-dust/10">
                  {outfit.category}
                </span>
              </div>

              {/* Gallery Thumbnails List (if multiple images exist in DB) */}
              {(() => {
                const galleryImages = [
                  ...(outfit.thumbnail ? [outfit.thumbnail] : []),
                  ...(Array.isArray(outfit.images) ? outfit.images : [])
                ].reduce((acc, current) => {
                  if (current && !acc.includes(current)) {
                    acc.push(current);
                  }
                  return acc;
                }, []);

                if (galleryImages.length <= 1) return null;

                return (
                  <div className="flex gap-2 overflow-x-auto pb-1.5">
                    {galleryImages.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleThumbnailClick(img)}
                        className={`relative w-12 h-[60px] flex-shrink-0 bg-brand-cream overflow-hidden rounded border transition-all duration-300 cursor-pointer ${
                          activeImage === img ? 'border-brand-espresso ring-1 ring-brand-espresso' : 'border-brand-dust/15'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={`${outfit.title} thumbnail ${idx}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 3.2 Product Details & Actions */}
            <div className="flex flex-col justify-between space-y-8">
              
              <div className="space-y-6">
                {/* Title & Badge */}
                <div className="space-y-2">
                  <span className="inline-block bg-brand-cream border border-brand-dust/20 px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-soft text-brand-espresso font-semibold">
                    {outfit.category}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-serif tracking-tight leading-tight">
                    {outfit.title}
                  </h1>
                </div>

                {/* Fabric, Color, Condition, Status Meta Row */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-brand-dust border-y border-brand-cream py-3">
                  <p>Fabric: <span className="font-medium text-brand-espresso capitalize">{outfit.fabric || 'silk'}</span></p>
                  <p>Color: <span className="font-medium text-brand-espresso capitalize">{outfit.color || 'black'}</span></p>
                  <p>Condition: <span className="font-medium text-brand-espresso capitalize">{outfit.condition || 'new'}</span></p>
                  <p>Status: <span className="font-medium text-brand-espresso capitalize">{outfit.status || 'available'}</span></p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-dust">Description</h4>
                  <p className="text-sm text-brand-dust font-light leading-relaxed">
                    {outfit.description}
                  </p>
                </div>

                {/* Measurements Grid */}
                {outfit.measurements && (
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-dust">Garment Measurements (Inches)</h4>
                    <div className="grid grid-cols-4 gap-2 bg-brand-cream p-3 rounded-soft border border-brand-dust/10 text-center">
                      <div>
                        <span className="text-[10px] text-brand-dust block">Bust</span>
                        <span className="text-sm font-semibold">{outfit.measurements.bust || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-dust block">Waist</span>
                        <span className="text-sm font-semibold">{outfit.measurements.waist || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-dust block">Hips</span>
                        <span className="text-sm font-semibold">{outfit.measurements.hips || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-dust block">Length</span>
                        <span className="text-sm font-semibold">{outfit.measurements.length || '-'}</span>
                      </div>
                    </div>
                    {outfit.measurements.alterationNotes && (
                      <p className="text-[10px] text-brand-dust italic leading-normal">
                        Note: {outfit.measurements.alterationNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing Ledgers & Checkout Trigger */}
              <div className="bg-brand-cream/50 p-5 rounded-luxury border border-brand-dust/10 space-y-6 pt-4">
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div>
                    <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Daily Rent</span>
                    <span className="text-xl md:text-2xl font-bold text-brand-espresso">
                      ₹{outfit.rentPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Security Deposit</span>
                    <span className="text-sm md:text-base font-semibold text-brand-espresso block">
                      ₹{outfit.refundableDeposit.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-[#8D4237] block mt-0.5 font-light leading-none">
                      (not charged yet — coming soon)
                    </span>
                  </div>
                  <div className="opacity-75">
                    <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Original MRP</span>
                    <span className="text-xs md:text-sm text-brand-dust line-through">
                      ₹{outfit.originalMRP ? outfit.originalMRP.toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>

                {!showDatePicker ? (
                  <button 
                    onClick={() => setShowDatePicker(true)}
                    disabled={outfit.status !== 'available'}
                    className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust disabled:bg-brand-dust/50 disabled:cursor-not-allowed py-3.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-[1px] cursor-pointer"
                  >
                    {outfit.status === 'available' ? 'Rent Now' : 'Garment Reserved'}
                  </button>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-brand-dust/10 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-brand-espresso">Select Rental Dates</h4>
                      <button 
                        onClick={() => {
                          setShowDatePicker(false);
                          setStartDate('');
                          setEndDate('');
                          setAvailabilityResult(null);
                          setValidationError('');
                          setApiError('');
                        }}
                        className="text-[10px] uppercase tracking-widest text-brand-dust hover:text-brand-espresso transition-colors duration-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-brand-dust font-semibold block">Start Date</label>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setEndDate(''); // Clear End Date when Start Date changes to avoid chronological mismatch
                            setAvailabilityResult(null);
                            setValidationError('');
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-white border border-brand-dust/10 rounded-soft px-3 py-2 text-xs font-light outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-brand-dust font-semibold block">End Date</label>
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setAvailabilityResult(null);
                            setValidationError('');
                          }}
                          min={startDate || new Date().toISOString().split('T')[0]}
                          className="w-full bg-white border border-brand-dust/10 rounded-soft px-3 py-2 text-xs font-light outline-none"
                        />
                      </div>
                    </div>

                    {validationError && (
                      <p className="text-[10px] text-red-500 font-light text-center">⚠️ {validationError}</p>
                    )}

                    {apiError && (
                      <p className="text-[10px] text-red-500 font-light text-center">⚠️ {apiError}</p>
                    )}

                    {availabilityResult && (
                      <div className={`p-3 rounded-soft text-center text-xs font-light ${
                        availabilityResult.available 
                          ? 'bg-green-50 border border-green-200/50 text-green-700' 
                          : 'bg-red-50 border border-red-200/50 text-red-700'
                      }`}>
                        {availabilityResult.available 
                          ? '✨ This outfit is fully available for your selected dates!' 
                          : 'Sorry, this outfit is already booked for some of your selected dates. Please try different dates.'
                        }
                      </div>
                    )}

                    {/* STAGE A: Outfit availability validation checks */}
                    {(!availabilityResult || !availabilityResult.available) ? (
                      <button 
                        onClick={handleCheckAvailability}
                        disabled={checking}
                        className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust disabled:bg-brand-dust/50 disabled:cursor-not-allowed py-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
                      >
                        {checking ? 'Checking Availability...' : 'Check Availability'}
                      </button>
                    ) : (
                      /* STAGE B: Available -> Checkout trigger actions */
                      <div className="space-y-2">
                        {user ? (
                          /* Customer: Initiates payment order holds */
                          <button 
                            onClick={handleProceedToBooking}
                            className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust py-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-[1px] cursor-pointer"
                          >
                            Proceed to Booking
                          </button>
                        ) : (
                          /* Guest: Prompts auth redirection */
                          <div className="space-y-2 text-center">
                            <p className="text-[10px] text-brand-dust font-light">
                              Please log in to proceed with booking.
                            </p>
                            <Link 
                              to="/login"
                              state={{ from: location }}
                              className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust py-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300 block text-center shadow-sm hover:shadow-md transform hover:-translate-y-[1px]"
                            >
                              Login to Continue
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>

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
  </>
);
}
