import React, { useState, useEffect } from 'react';
import { getAdminBookings, processDepositRefundAdmin } from '../../api/bookings.js';

export default function AdminRefunds() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tabs: 'pending' (pending_review) vs 'processed'
  const [activeTab, setActiveTab] = useState('pending');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal states
  const [activeBooking, setActiveBooking] = useState(null);
  const [damageDeduction, setDamageDeduction] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchCompletedBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Completed bookings are where deposit refunds take place
      const res = await getAdminBookings({ status: 'completed', limit: 100 });
      if (res && res.success && res.data?.bookings) {
        setBookings(res.data.bookings);
      } else {
        throw new Error('Failed to load global completed registry.');
      }
    } catch (err) {
      console.error('Error fetching completed bookings:', err);
      setError(err.response?.data?.message || 'Error loading completed bookings logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedBookings();
  }, []);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/premium_lehenga_rental.png';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Client-side Preview Calculator Formulas (Mirrors backend engine)
  const calculateRefundPreview = (booking) => {
    if (!booking) return { bookedDays: 0, dailyRentRate: 0, lateDays: 0, lateFeeAmount: 0, estRefund: 0 };

    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    
    // Booked Days (ceil diff)
    const diffBookedTime = end.getTime() - start.getTime();
    const bookedDays = Math.max(1, Math.ceil(diffBookedTime / (1000 * 3600 * 24)));
    
    // Daily Rent Rate
    const dailyRentRate = booking.totalRentAmount / bookedDays;
    
    // Late Days
    const actualReturnDate = booking.depositRefundDetails?.actualReturnDate;
    let lateDays = 0;
    if (actualReturnDate) {
      const actualReturn = new Date(actualReturnDate);
      const diffTime = actualReturn.getTime() - end.getTime();
      lateDays = Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
    }
    
    // Late Fee Amount
    const lateFeeAmount = dailyRentRate * lateDays;
    
    // Refund Estimate (Before manual damage deductions)
    const estRefund = Math.max(0, booking.securityDeposit - lateFeeAmount);

    return {
      bookedDays,
      dailyRentRate,
      lateDays,
      lateFeeAmount,
      estRefund
    };
  };

  // Filter lists based on active tab
  const filteredBookings = bookings.filter((booking) => {
    const status = booking.depositRefundDetails?.status;
    if (activeTab === 'pending') {
      return status === 'pending_review';
    } else {
      return status === 'processed';
    }
  });

  const pendingCount = bookings.filter(b => b.depositRefundDetails?.status === 'pending_review').length;
  const processedCount = bookings.filter(b => b.depositRefundDetails?.status === 'processed').length;

  // Pagination calculations
  const totalCount = filteredBookings.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedList = filteredBookings.slice((page - 1) * limit, page * limit);

  const handleProcessClick = (booking) => {
    setActiveBooking(booking);
    setDamageDeduction('');
    setDamageReason('');
    setSubmitError(null);
  };

  const handleRefundConfirm = async (e) => {
    e.preventDefault();
    if (!activeBooking) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const deductionAmount = Number(damageDeduction) || 0;

    try {
      const res = await processDepositRefundAdmin(activeBooking.bookingId, {
        damageDeductionAmount: deductionAmount,
        damageReason: damageReason.trim()
      });

      if (res && res.success && res.data?.booking) {
        const updatedBooking = res.data.booking;
        
        // In-place local state update: replace matching booking with updated version
        setBookings((prevBookings) =>
          prevBookings.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
        );
        setActiveBooking(null);
      } else {
        throw new Error('Update rejected by server.');
      }
    } catch (err) {
      console.error('Error processing deposit refund:', err);
      if (err.response && err.response.data && err.response.status < 500) {
        setSubmitError(err.response.data.message || 'Refund processing request rejected.');
      } else {
        setSubmitError('Something went wrong, please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate live updating refund in modal
  const getLiveRefundPreview = () => {
    if (!activeBooking) return 0;
    const { lateFeeAmount } = calculateRefundPreview(activeBooking);
    const deduction = Number(damageDeduction) || 0;
    return Math.max(0, activeBooking.securityDeposit - lateFeeAmount - deduction);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in relative text-brand-espresso">
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-dust/10 pb-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-brand-dust font-semibold block mb-0.5">
              Logistics Pipeline
            </span>
            <h1 className="text-2xl md:text-3xl font-serif tracking-tight">
              Deposit Refunds Management
            </h1>
          </div>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex border-b border-brand-dust/10 pb-px gap-6">
          <button
            onClick={() => { setActiveTab('pending'); setPage(1); }}
            className={`pb-3 text-xs uppercase tracking-widest font-semibold transition-all duration-300 relative cursor-pointer ${
              activeTab === 'pending' ? 'text-brand-espresso' : 'text-brand-dust hover:text-brand-espresso'
            }`}
          >
            Pending Review ({pendingCount})
            {activeTab === 'pending' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-espresso animate-fade-in" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('processed'); setPage(1); }}
            className={`pb-3 text-xs uppercase tracking-widest font-semibold transition-all duration-300 relative cursor-pointer ${
              activeTab === 'processed' ? 'text-brand-espresso' : 'text-brand-dust hover:text-brand-espresso'
            }`}
          >
            Processed History ({processedCount})
            {activeTab === 'processed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-espresso animate-fade-in" />
            )}
          </button>
        </div>

        {/* Table Body / Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-brand-espresso border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-brand-dust uppercase tracking-widest font-medium">
              Loading deposit registries...
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-soft border border-[#8D4237]/20 p-6 text-center space-y-2">
            <p className="text-[#8D4237] font-medium text-xs">⚠️ {error}</p>
            <button
              onClick={fetchCompletedBookings}
              className="text-[10px] uppercase tracking-widest font-semibold text-brand-espresso hover:text-brand-dust transition-colors duration-300 border border-brand-espresso/20 px-3 py-1.5 rounded"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-luxury border border-brand-dust/10 shadow-sm overflow-hidden">
            {paginatedList.length === 0 ? (
              /* Empty state matching tab query selection */
              <div className="p-16 text-center space-y-4">
                <span className="text-2xl block">💵</span>
                <h3 className="font-serif text-base">
                  {activeTab === 'pending' ? 'No refunds pending review' : 'No processed refunds yet'}
                </h3>
                <p className="text-xs text-brand-dust max-w-sm mx-auto leading-relaxed">
                  {activeTab === 'pending'
                    ? 'All completed garment returns have been successfully audited and resolved.'
                    : 'There are no historical refund records matching this classification in the database logs.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-brand-cream/40 border-b border-brand-dust/10 text-brand-espresso font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-[110px]">Booking ID</th>
                      <th className="py-3 px-4 w-[180px]">Customer</th>
                      <th className="py-3 px-4 w-[220px]">Outfit</th>
                      {activeTab === 'pending' ? (
                        <>
                          <th className="py-3 px-4 w-[180px]">Rental Period</th>
                          <th className="py-3 px-4 w-[120px]">Returned Date</th>
                          <th className="py-3 px-4 text-right w-[100px]">Deposit</th>
                          <th className="py-3 px-4 text-right w-[120px]">Est. Late Fee</th>
                          <th className="py-3 px-4 text-center w-[140px]">Actions</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4 text-center w-[80px]">Late Days</th>
                          <th className="py-3 px-4 text-right w-[100px]">Late Fee</th>
                          <th className="py-3 px-4 text-right w-[100px]">Deduction</th>
                          <th className="py-3 px-4 w-[180px]">Deduction Reason</th>
                          <th className="py-3 px-4 text-right w-[100px]">Refund Paid</th>
                          <th className="py-3 px-4 w-[120px]">Audited By</th>
                          <th className="py-3 px-4 w-[120px]">Audited At</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-dust/10 font-light">
                    {paginatedList.map((booking) => {
                      const customer = booking.customer || {};
                      const outfit = booking.outfit || {};
                      const refundDetails = booking.depositRefundDetails || {};
                      const refundPreview = calculateRefundPreview(booking);
                      
                      return (
                        <tr
                          key={booking._id}
                          className="hover:bg-brand-cream/10 transition-colors duration-150"
                        >
                          {/* Booking ID */}
                          <td className="py-3.5 px-4 font-mono font-medium text-brand-espresso whitespace-nowrap">
                            {booking.bookingId}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-brand-espresso">{customer.name || 'N/A'}</div>
                            <div className="text-[10px] text-brand-dust">{customer.email || 'N/A'}</div>
                            {customer.phone && (
                              <div className="text-[9px] text-brand-dust font-mono mt-0.5">{customer.phone}</div>
                            )}
                          </td>

                          {/* Outfit */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={outfit.thumbnail}
                                onError={handleImageError}
                                alt={outfit.title}
                                className="w-8 h-10 object-cover rounded bg-brand-cream border border-brand-dust/10"
                              />
                              <div>
                                <div className="font-medium text-brand-espresso line-clamp-1">{outfit.title || 'N/A'}</div>
                                <div className="text-[10px] text-brand-dust">Rent: ₹{outfit.rentPrice || '0'}</div>
                              </div>
                            </div>
                          </td>

                          {activeTab === 'pending' ? (
                            <>
                              {/* Rental Period */}
                              <td className="py-3.5 px-4 text-brand-espresso leading-relaxed">
                                <div>{formatDate(booking.startDate)}</div>
                                <div className="text-[10px] text-brand-dust">to {formatDate(booking.endDate)}</div>
                              </td>

                              {/* Return Date */}
                              <td className="py-3.5 px-4 text-brand-espresso">
                                {formatDate(refundDetails.actualReturnDate)}
                              </td>

                              {/* Security Deposit */}
                              <td className="py-3.5 px-4 text-right font-medium text-brand-espresso">
                                ₹{booking.securityDeposit}
                              </td>

                              {/* Est. Late Fee */}
                              <td className="py-3.5 px-4 text-right text-brand-espresso">
                                <div className={refundPreview.lateFeeAmount > 0 ? 'text-[#8D4237] font-semibold' : 'text-brand-dust'}>
                                  ₹{refundPreview.lateFeeAmount.toFixed(0)}
                                </div>
                                {refundPreview.lateDays > 0 && (
                                  <div className="text-[9px] text-brand-dust">({refundPreview.lateDays} days late)</div>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleProcessClick(booking)}
                                  className="inline-block border border-brand-espresso/20 hover:border-brand-espresso text-brand-espresso py-1.5 px-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                                >
                                  Process Refund
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Late Days */}
                              <td className="py-3.5 px-4 text-center text-brand-espresso">
                                {refundDetails.lateDays || 0}
                              </td>

                              {/* Late Fee */}
                              <td className="py-3.5 px-4 text-right text-brand-espresso">
                                ₹{refundDetails.lateFeeAmount || 0}
                              </td>

                              {/* Damage Deduction */}
                              <td className="py-3.5 px-4 text-right text-[#8D4237] font-medium">
                                ₹{refundDetails.damageDeductionAmount || 0}
                              </td>

                              {/* Deduction Reason */}
                              <td className="py-3.5 px-4 text-brand-dust italic">
                                {refundDetails.damageReason || '—'}
                              </td>

                              {/* Final Refund Paid */}
                              <td className="py-3.5 px-4 text-right font-semibold text-brand-sage">
                                ₹{refundDetails.finalRefundAmount || 0}
                              </td>

                              {/* Audited By */}
                              <td className="py-3.5 px-4 text-brand-espresso truncate max-w-[120px]">
                                {refundDetails.processedBy?.name || '—'}
                                {refundDetails.processedBy?.email && (
                                  <div className="text-[9px] text-brand-dust truncate">{refundDetails.processedBy.email}</div>
                                )}
                              </td>

                              {/* Audited At */}
                              <td className="py-3.5 px-4 text-brand-dust">
                                {formatDate(refundDetails.processedAt)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-brand-dust/10 bg-brand-cream/10 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="relative inline-flex items-center rounded-md border border-brand-dust/20 bg-white px-4 py-2 text-xs font-semibold text-brand-dust hover:bg-brand-cream/10 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="relative ml-3 inline-flex items-center rounded-md border border-brand-dust/20 bg-white px-4 py-2 text-xs font-semibold text-brand-dust hover:bg-brand-cream/10 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] text-brand-dust uppercase tracking-wider font-semibold">
                      Showing{' '}
                      <span className="font-bold text-brand-espresso">{(page - 1) * limit + 1}</span>{' '}
                      to{' '}
                      <span className="font-bold text-brand-espresso">
                        {Math.min(page * limit, totalCount)}
                      </span>{' '}
                      of <span className="font-bold text-brand-espresso">{totalCount}</span> records
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-brand-dust ring-1 ring-inset ring-brand-dust/20 hover:bg-brand-cream/10 focus:z-20 focus:outline-offset-0 disabled:opacity-40 cursor-pointer"
                      >
                        <span className="sr-only">Previous</span>
                        ‹
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-brand-espresso ring-1 ring-inset ring-brand-dust/20 focus:outline-offset-0">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-brand-dust ring-1 ring-inset ring-brand-dust/20 hover:bg-brand-cream/10 focus:z-20 focus:outline-offset-0 disabled:opacity-40 cursor-pointer"
                      >
                        <span className="sr-only">Next</span>
                        ›
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Process Refund Modal Overlay (escaped sibling pattern) */}
      {activeBooking && (
        <div className="fixed inset-0 bg-brand-espresso/60 backdrop-blur-sm z-[100] overflow-y-auto flex items-start justify-center p-4 py-8 md:py-16 animate-fade-in">
          <div className="max-w-md w-full bg-white p-5 sm:p-6 rounded-luxury border border-brand-dust/15 shadow-xl space-y-4">
            
            {/* Modal Header */}
            <div className="space-y-1 text-brand-espresso">
              <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Deposit Audit Review</span>
              <h3 className="font-serif text-xl sm:text-2xl">Process Deposit Refund</h3>
              
              <div className="text-xs text-brand-dust font-light space-y-1 pt-1.5 border-t border-brand-cream">
                <p>
                  <span className="font-semibold text-brand-espresso">Booking ID:</span> {activeBooking.bookingId}
                </p>
                <p>
                  <span className="font-semibold text-brand-espresso">Customer:</span> {activeBooking.customer?.name}
                </p>
                <p>
                  <span className="font-semibold text-brand-espresso">Outfit:</span> {activeBooking.outfit?.title}
                </p>
                <p>
                  <span className="font-semibold text-brand-espresso">Rental Window:</span>{' '}
                  {formatDate(activeBooking.startDate)} to {formatDate(activeBooking.endDate)}
                </p>
              </div>
            </div>

            {/* Read-Only Preview Calculations */}
            {(() => {
              const calc = calculateRefundPreview(activeBooking);
              return (
                <div className="bg-brand-cream/40 rounded-soft border border-brand-dust/10 p-3 space-y-2 text-xs text-brand-espresso">
                  <div className="flex justify-between">
                    <span className="text-brand-dust">Security Deposit:</span>
                    <span className="font-medium">₹{activeBooking.securityDeposit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-dust">Est. Late Return Days:</span>
                    <span className={calc.lateDays > 0 ? 'text-[#8D4237] font-semibold' : ''}>
                      {calc.lateDays} days
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-brand-dust/5 pb-2">
                    <span className="text-brand-dust">Est. Late Fees Charged:</span>
                    <span className={calc.lateFeeAmount > 0 ? 'text-[#8D4237] font-semibold' : ''}>
                      ₹{calc.lateFeeAmount.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 font-semibold text-[#8D4237]">
                    <span>Subtotal Refund Preview:</span>
                    <span>₹{calc.estRefund.toFixed(0)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Refund Processing Form */}
            <form onSubmit={handleRefundConfirm} className="space-y-4 text-brand-espresso">
              {/* Damage Deduction Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">
                  Damage Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Enter charge amount (0 if none)..."
                  value={damageDeduction}
                  onChange={(e) => setDamageDeduction(e.target.value)}
                  className="w-full bg-brand-cream border border-brand-dust/20 focus:border-brand-espresso rounded-soft p-2.5 text-xs font-medium outline-none transition-colors duration-300"
                />
              </div>

              {/* Damage Reason Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">
                    Reason for Damage/Deduction
                  </label>
                  <span className="text-[9px] text-brand-dust">
                    {damageReason.length}/500
                  </span>
                </div>
                <textarea
                  rows="2"
                  maxLength={500}
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  placeholder="Describe material damage, stains or details of late fees adjustment..."
                  className="w-full bg-brand-cream border border-brand-dust/20 focus:border-brand-espresso rounded-soft p-3 text-xs font-light outline-none resize-none transition-colors duration-300"
                />
              </div>

              {/* Live Calculator Preview */}
              <div className="bg-brand-espresso text-brand-cream rounded-soft p-3 text-center space-y-1 shadow-sm">
                <span className="text-[9px] uppercase tracking-widest text-brand-dust block">Live Refund Calculation Preview</span>
                <span className="text-xl font-serif">Estimated Final Refund: ₹{getLiveRefundPreview().toFixed(0)}</span>
                <p className="text-[9px] text-brand-dust font-light italic">
                  * Final amount calculated by server on submit.
                </p>
              </div>

              {submitError && (
                <p className="text-xs text-[#8D4237] font-medium leading-normal animate-fade-in">
                  ⚠️ {submitError}
                </p>
              )}

              {/* Cancel / Confirm Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-brand-cream">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setActiveBooking(null)}
                  className="border border-brand-dust/20 text-brand-dust hover:text-brand-espresso hover:border-brand-espresso px-4 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-espresso hover:bg-brand-dust text-brand-cream disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
