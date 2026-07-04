import React, { useState, useEffect } from 'react';
import { getAdminBookings, updateBookingStatusAdmin } from '../../api/bookings';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status transition states
  const [activeBooking, setActiveBooking] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Allowed transitions map matching backend lifecycle state machine
  const allowedTransitions = {
    pending: ['cancelled'],
    confirmed: ['active', 'cancelled', 'refunded'],
    active: ['completed'],
    completed: ['refunded'],
    cancelled: [],
    refunded: []
  };

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        status: statusFilter || undefined
      };
      const res = await getAdminBookings(params);
      if (res && res.success && Array.isArray(res.data?.bookings)) {
        setBookings(res.data.bookings);
        setTotalCount(res.data.totalCount || 0);
      } else {
        setBookings([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching admin bookings:', err);
      if (err.response && err.response.status === 404) {
        setError(err.response.data?.message || 'The administrative bookings endpoint could not be found.');
      } else {
        setError('Something went wrong loading bookings history. Please verify your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

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

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1); // Reset to first page on filter change
  };

  const handleUpdateClick = (booking) => {
    setActiveBooking(booking);
    setAdminNotes('');
    
    // Set default next state to the first permitted transition if available
    const nextPermitted = allowedTransitions[booking.bookingStatus] || [];
    setNewStatus(nextPermitted[0] || '');
    setUpdateError(null);
  };

  const handleUpdateConfirm = async (e) => {
    e.preventDefault();
    if (!activeBooking || !newStatus) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await updateBookingStatusAdmin(activeBooking.bookingId, {
        bookingStatus: newStatus,
        adminNotes: adminNotes.trim()
      });

      if (res && res.success && res.data?.booking) {
        const updatedBooking = res.data.booking;
        
        // Optimistic local state update
        setBookings((prevBookings) =>
          prevBookings.map((b) =>
            b._id === updatedBooking._id 
              ? { 
                  ...b, 
                  bookingStatus: updatedBooking.bookingStatus,
                  paymentStatus: updatedBooking.paymentStatus,
                  deliveryStatus: updatedBooking.deliveryStatus,
                  adminNotes: updatedBooking.adminNotes
                } 
              : b
          )
        );
        setActiveBooking(null);
      } else {
        throw new Error('Update rejected by server.');
      }
    } catch (err) {
      console.error('Error updating booking status:', err);
      if (err.response && err.response.data && err.response.status < 500) {
        setUpdateError(err.response.data.message || 'Status transition request rejected.');
      } else {
        setUpdateError('Something went wrong, please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Color mapping badges mirroring MyBookings.jsx + Design System Palette
  const getBookingStatusClass = (status) => {
    switch (status) {
      case 'pending':
        // Champagne Gold (Pending Hold)
        return 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20';
      case 'confirmed':
        // Muted Blush (Confirmed)
        return 'bg-brand-blush/20 text-brand-espresso border border-brand-blush/40 font-medium';
      case 'active':
        // Warm Espresso (Active Rental)
        return 'bg-brand-espresso text-brand-cream border border-brand-espresso';
      case 'completed':
        // Alabaster Cream + Dusty Charcoal border (Completed)
        return 'bg-brand-cream text-brand-dust border border-brand-dust/20';
      case 'cancelled':
      case 'refunded':
        // Terracotta (Terminal Cancelled/Refunded)
        return 'bg-[#8D4237]/10 text-[#8D4237] border border-[#8D4237]/20';
      default:
        return 'bg-brand-cream text-brand-espresso border border-brand-dust/10';
    }
  };

  const getPaymentStatusClass = (status) => {
    switch (status) {
      case 'pending':
        // Champagne Gold (Pending payment check)
        return 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20';
      case 'paid':
        // Soft Sage (Success payment state)
        return 'bg-brand-sage/20 text-brand-espresso border border-brand-sage/40 font-medium';
      case 'failed':
        // Terracotta (Failed payment state)
        return 'bg-[#8D4237]/10 text-[#8D4237] border border-[#8D4237]/20';
      case 'refunded':
        // Dusty Charcoal + Alabaster Cream border (Refunded state)
        return 'bg-brand-cream text-brand-dust border border-brand-dust/20';
      case 'refund_failed':
        // Bright Terracotta Warning (Refund failed state)
        return 'bg-[#8D4237]/20 text-[#8D4237] border border-[#8D4237]/50 font-semibold';
      default:
        return 'bg-brand-cream text-brand-dust border border-brand-dust/10';
    }
  };

  const getDeliveryStatusClass = (status) => {
    switch (status) {
      case 'pending':
        // Champagne Gold (Awaiting Dispatch hold)
        return 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20';
      case 'dispatched':
        // Muted Blush (Dispatched state)
        return 'bg-brand-blush/20 text-brand-espresso border border-brand-blush/40 font-medium';
      case 'delivered':
        // Soft Sage (Delivered state)
        return 'bg-brand-sage/20 text-brand-espresso border border-brand-sage/40 font-medium';
      case 'returned':
        // Dusty Charcoal + Alabaster Cream border (Returned state)
        return 'bg-brand-cream text-brand-dust border border-brand-dust/20';
      default:
        return 'bg-brand-cream text-brand-dust border border-brand-dust/10';
    }
  };

  const totalPages = Math.ceil(totalCount / limit);
  const skip = (page - 1) * limit;
  const activeIsTerminal = activeBooking ? ['cancelled', 'refunded'].includes(activeBooking.bookingStatus) : false;

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
            Bookings Dashboard
          </h1>
        </div>
        
        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="p-2 border border-brand-dust/20 rounded-soft bg-brand-cream/10 focus:outline-none focus:border-brand-espresso text-xs font-medium cursor-pointer"
          >
            <option value="">All Bookings</option>
            <option value="pending">Pending Hold</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active Rental</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* 1. Loading State */}
      {isLoading && (
        <div className="bg-white rounded-soft border border-brand-dust/10 p-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
          <p className="text-xs text-brand-dust font-light tracking-wider">Loading bookings log registry...</p>
        </div>
      )}

      {/* 2. Error State */}
      {error && !isLoading && (
        <div className="bg-white rounded-soft border border-[#8D4237]/20 p-10 text-center max-w-xl mx-auto space-y-4 shadow-sm my-8">
          <span className="text-xl">⚠️</span>
          <h3 className="font-serif text-base">Bookings Fetch Failure</h3>
          <p className="text-xs text-brand-dust leading-relaxed">{error}</p>
          <button
            onClick={fetchBookings}
            className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-5 py-2 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* 3. Loaded Table View */}
      {!isLoading && !error && (
        <div className="bg-white rounded-soft border border-brand-dust/10 shadow-sm overflow-hidden">
          {bookings.length === 0 ? (
            /* Empty State */
            <div className="p-16 text-center space-y-4">
              <span className="text-2xl block">📋</span>
              <h3 className="font-serif text-base">No bookings found</h3>
              <p className="text-xs text-brand-dust max-w-sm mx-auto leading-relaxed">
                There are currently no transactions matching the selected criteria in the database logs.
              </p>
            </div>
          ) : (
            /* Dense Table Layout */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-brand-cream/40 border-b border-brand-dust/10 text-brand-espresso font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-[110px]">Booking ID</th>
                    <th className="py-3 px-4 w-[180px]">Customer</th>
                    <th className="py-3 px-4 w-[220px]">Outfit</th>
                    <th className="py-3 px-4 w-[180px]">Rental Period</th>
                    <th className="py-3 px-4 text-right w-[120px]">Fees (Rent/Dep)</th>
                    <th className="py-3 px-4 text-center w-[120px]">Booking Status</th>
                    <th className="py-3 px-4 text-center w-[100px]">Payment</th>
                    <th className="py-3 px-4 text-center w-[100px]">Delivery</th>
                    <th className="py-3 px-4 text-center w-[155px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dust/10 font-light">
                  {bookings.map((booking) => {
                    const customer = booking.customer || {};
                    const outfit = booking.outfit || {};
                    const isTerminalState = ['cancelled', 'refunded'].includes(booking.bookingStatus);
                    
                    return (
                      <tr 
                        key={booking._id} 
                        className="hover:bg-brand-cream/10 transition-colors duration-150"
                      >
                        {/* Booking ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-brand-espresso">
                          {booking.bookingId}
                        </td>

                        {/* Customer details */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-brand-espresso">{customer.name || 'N/A'}</div>
                          <div className="text-[10px] text-brand-dust">{customer.email || 'N/A'}</div>
                          {customer.phone && <div className="text-[9px] text-brand-dust font-mono mt-0.5">{customer.phone}</div>}
                        </td>

                        {/* Outfit Thumbnail & Title */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-12 rounded overflow-hidden bg-brand-cream border border-brand-dust/10 flex-shrink-0">
                              <img
                                src={outfit.thumbnail}
                                alt={outfit.title || 'Outfit'}
                                className="w-full h-full object-cover"
                                onError={handleImageError}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-serif text-xs text-brand-espresso truncate font-medium max-w-[160px]">
                                {outfit.title || 'Exclusive Garment'}
                              </div>
                              <div className="text-[9px] text-brand-dust truncate max-w-[160px] font-mono mt-0.5">
                                ID: {outfit._id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 text-[10px] leading-relaxed">
                          <div>
                            <span className="text-[9px] uppercase font-semibold text-brand-dust">Start:</span>{' '}
                            {formatDate(booking.startDate)}
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-semibold text-brand-dust">End:</span>{' '}
                            {formatDate(booking.endDate)}
                          </div>
                        </td>

                        {/* Financials (Rent / Deposits) */}
                        <td className="py-3.5 px-4 text-right">
                          <div>
                            <span className="text-[9px] text-brand-dust font-light">Rent:</span>{' '}
                            <span className="font-semibold">₹{booking.totalRentAmount?.toLocaleString('en-IN') || '0'}</span>
                          </div>
                          <div className="text-[10px] text-brand-dust/80">
                            <span>Dep: ₹{booking.refundableDeposit?.toLocaleString('en-IN') || '0'}</span>
                          </div>
                        </td>

                        {/* Booking Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getBookingStatusClass(booking.bookingStatus)}`}>
                            {booking.bookingStatus}
                          </span>
                          
                          {/* Cancellation Reason rendering */}
                          {booking.bookingStatus === 'cancelled' && booking.cancellationReason && (
                            <div className="text-[9px] text-red-600 font-light mt-1 max-w-[110px] mx-auto leading-normal break-words">
                              Reason: "{booking.cancellationReason}"
                            </div>
                          )}
                        </td>

                        {/* Payment Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${getPaymentStatusClass(booking.paymentStatus)}`}>
                            {booking.paymentStatus}
                          </span>
                        </td>

                        {/* Delivery Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${getDeliveryStatusClass(booking.deliveryStatus)}`}>
                            {booking.deliveryStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          {!isTerminalState ? (
                            <button
                              onClick={() => handleUpdateClick(booking)}
                              className="inline-block border border-brand-espresso/20 hover:border-brand-espresso text-brand-espresso py-1 px-2.5 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                            >
                              Update Status
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateClick(booking)}
                              className="inline-block border border-brand-dust/30 hover:border-brand-dust text-brand-dust hover:text-brand-espresso py-1 px-2.5 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                            >
                              View History
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalCount > limit && (
            <div className="flex items-center justify-between border-t border-brand-dust/10 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="relative inline-flex items-center rounded-soft border border-brand-dust/20 bg-white px-4 py-2 text-xs font-medium text-brand-espresso hover:bg-brand-cream/10 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="relative ml-3 inline-flex items-center rounded-soft border border-brand-dust/20 bg-white px-4 py-2 text-xs font-medium text-brand-espresso hover:bg-brand-cream/10 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-brand-dust font-light">
                    Showing <span className="font-semibold text-brand-espresso">{skip + 1}</span> to <span className="font-semibold text-brand-espresso">{Math.min(skip + limit, totalCount)}</span> of <span className="font-semibold text-brand-espresso">{totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-brand-dust ring-1 ring-inset ring-brand-dust/20 hover:bg-brand-cream/10 focus:z-20 focus:outline-offset-0 disabled:opacity-40 cursor-pointer"
                    >
                      <span className="sr-only">Previous</span>
                      ‹
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-brand-espresso ring-1 ring-inset ring-brand-dust/20 focus:outline-offset-0">
                      Page {page} of {totalPages || 1}
                    </span>
                    <button
                      disabled={page === totalPages || totalPages === 0}
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

      {/* Update Booking Status Modal Overlay */}
      {activeBooking && (
        <div className="fixed inset-0 bg-brand-espresso/60 backdrop-blur-sm z-[100] overflow-y-auto flex items-start justify-center p-4 py-8 md:py-16">
          <div className="max-w-md w-full bg-white p-5 sm:p-6 rounded-luxury border border-brand-dust/15 shadow-xl animate-fade-in space-y-4 my-auto">
            
            <div className="space-y-1 text-brand-espresso">
              <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">
                {activeIsTerminal ? 'Archive Log Review' : 'Administrative Status Update'}
              </span>
              <h3 className="font-serif text-xl sm:text-2xl">
                {activeIsTerminal ? 'Booking Audit History' : 'Modify Booking Lifecycle'}
              </h3>
              
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
                  <span className="font-semibold text-brand-espresso">Current Status:</span>{' '}
                  <span className="uppercase font-bold tracking-wider text-[10px] text-brand-espresso">
                    {activeBooking.bookingStatus}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateConfirm} className="space-y-4 text-brand-espresso">
              {/* Target Status Select */}
              {!activeIsTerminal && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Select Next Lifecycle Status *</label>
                  <select
                    required
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-brand-cream border border-brand-dust/20 focus:border-brand-espresso rounded-soft p-2.5 text-xs font-semibold outline-none transition-colors duration-300"
                  >
                    {(allowedTransitions[activeBooking.bookingStatus] || []).map((status) => (
                      <option key={status} value={status}>
                        {status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Previous Notes History Log */}
              {activeBooking.adminNotes ? (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Previous History Logs</label>
                  <div className="w-full max-h-[140px] overflow-y-auto bg-brand-cream/60 border border-brand-dust/10 rounded-soft p-2.5 text-[10px] text-brand-dust leading-normal whitespace-pre-line font-light">
                    {activeBooking.adminNotes.split(' | ').join('\n')}
                  </div>
                </div>
              ) : (
                activeIsTerminal && (
                  <div className="text-xs text-brand-dust font-light italic py-2">No audit log history recorded for this transaction.</div>
                )
              )}

              {/* Admin Notes */}
              {!activeIsTerminal && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">Add Audit Note</label>
                  <textarea
                    rows="2"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add a new note for this update (optional)..."
                    className="w-full bg-brand-cream border border-brand-dust/20 focus:border-brand-espresso rounded-soft p-3 text-xs font-light outline-none resize-none transition-colors duration-300"
                  />
                </div>
              )}

              {updateError && (
                <p className="text-xs text-[#8D4237] font-medium leading-normal animate-fade-in">
                  ⚠️ {updateError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-brand-cream">
                {activeIsTerminal ? (
                  <button
                    type="button"
                    onClick={() => setActiveBooking(null)}
                    className="border border-brand-dust/20 text-brand-dust hover:text-brand-espresso hover:border-brand-espresso px-5 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer w-full text-center"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveBooking(null)}
                      className="border border-brand-dust/20 text-brand-dust hover:text-brand-espresso hover:border-brand-espresso px-4 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating || !newStatus}
                      className="bg-brand-espresso hover:bg-brand-dust text-brand-cream disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm cursor-pointer"
                    >
                      {isUpdating ? 'Updating...' : 'Confirm Update'}
                    </button>
                  </>
                )}
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
