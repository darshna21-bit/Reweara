import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUsersApi, updateUserRoleApi } from '../../api/auth';

/**
 * AdminManageUsers Component
 * SuperAdmin-only dashboard interface to search users and manage admin roles.
 */
export default function AdminManageUsers() {
  const { user: currentUser } = useAuth();

  // Current Admins list state
  const [admins, setAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [adminsError, setAdminsError] = useState(null);

  // Search user state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal and Role update states
  const [actionTarget, setActionTarget] = useState(null); // { user, targetRole }
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Fetch current admins list (role: admin or super_admin)
  const fetchAdmins = async (showLoading = true) => {
    if (showLoading) setIsLoadingAdmins(true);
    setAdminsError(null);
    try {
      const res = await getUsersApi();
      if (res && res.success && Array.isArray(res.data?.users)) {
        setAdmins(res.data.users);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setAdminsError(
        err.response?.data?.message || 'Failed to load administrator accounts. Please try again.'
      );
    } finally {
      if (showLoading) setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Handle exact email search
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const query = searchEmail.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const res = await getUsersApi(query);
      if (res && res.success && Array.isArray(res.data?.users)) {
        setSearchResults(res.data.users);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchError(
        err.response?.data?.message || 'Failed to search account. Please check your connection.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Click handler to open promotion/demotion modal
  const handleActionClick = (targetUser, targetRole) => {
    setActionTarget({ user: targetUser, targetRole });
    setActionError(null);
  };

  // Confirm promotion/demotion handler
  const handleActionConfirm = async () => {
    if (!actionTarget) return;
    setIsSavingAction(true);
    setActionError(null);

    const { user, targetRole } = actionTarget;

    try {
      await updateUserRoleApi(user.id || user._id, targetRole);
      
      // Update search results list in-place (clears or updates the search target element status)
      setSearchResults((prevResults) =>
        prevResults.map((r) =>
          (r.id || r._id) === (user.id || user._id) ? { ...r, role: targetRole } : r
        )
      );

      // Silently re-fetch the current admins list to sync details dynamically
      await fetchAdmins(false);

      // Close modal
      setActionTarget(null);
    } catch (err) {
      console.error('Error updating user role:', err);
      setActionError(
        err.response?.data?.message || 'Failed to update user role credentials. Please retry.'
      );
    } finally {
      setIsSavingAction(false);
    }
  };

  // Curated premium role styling classes
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-brand-espresso text-brand-cream border-brand-espresso/15';
      case 'admin':
        return 'bg-brand-gold/10 text-brand-espresso border-brand-gold/30';
      case 'customer':
        return 'bg-gray-50 text-gray-500 border-gray-200/60';
      default:
        return 'bg-brand-cream text-brand-espresso border-brand-dust/10';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Panel */}
      <div className="border-b border-brand-dust/10 pb-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-brand-dust font-semibold block mb-0.5">
          Access Control
        </span>
        <h1 className="text-2xl md:text-3xl font-serif tracking-tight text-brand-espresso">
          Manage Admin Accounts
        </h1>
      </div>

      {/* 1. Search Bar Interface */}
      <div className="bg-white rounded-soft border border-brand-dust/10 p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-base text-brand-espresso">Search Accounts</h2>
          <p className="text-xs text-brand-dust font-light leading-relaxed">
            Enter an exact email address to promote a customer to admin, or search for an admin.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-lg">
          <input
            type="email"
            required
            placeholder="e.g. customer@example.com"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1 bg-brand-cream/30 border border-brand-dust/20 px-3 py-2 rounded-soft text-xs text-brand-espresso placeholder-brand-dust focus:outline-none focus:border-brand-espresso/60"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-5 py-2 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* 2. Search Results Panel */}
      {hasSearched && (
        <div className="bg-white rounded-soft border border-brand-dust/10 p-5 shadow-sm space-y-4">
          <h2 className="font-serif text-base text-brand-espresso border-b border-brand-dust/10 pb-2">
            Search Results
          </h2>

          {isSearching && (
            <div className="py-6 flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
              <p className="text-xs text-brand-dust font-light">Retrieving account status...</p>
            </div>
          )}

          {searchError && !isSearching && (
            <div className="text-xs text-[#8D4237] bg-[#8D4237]/10 p-3.5 rounded-soft border border-[#8D4237]/20">
              ⚠️ {searchError}
            </div>
          )}

          {!isSearching && !searchError && searchResults.length === 0 && (
            <p className="text-xs text-brand-dust font-light italic">
              No account matched the exact email address. Please double-check spelling.
            </p>
          )}

          {!isSearching && !searchError && searchResults.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-brand-cream/20 border-b border-brand-dust/10 text-brand-espresso font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3 text-center">Clearance Level</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dust/10 text-brand-espresso font-light">
                  {searchResults.map((user) => {
                    const userIdStr = (user.id || user._id)?.toString();
                    const currentUserIdStr = currentUser?.id?.toString();
                    const isSelf = userIdStr === currentUserIdStr;

                    return (
                      <tr key={userIdStr} className="hover:bg-brand-cream/5">
                        <td className="py-3 px-3 font-medium">{user.name}</td>
                        <td className="py-3 px-3">{user.email}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isSelf ? (
                            <span className="text-[10px] text-brand-dust font-light italic">Current Account</span>
                          ) : user.role === 'super_admin' ? (
                            <span className="text-[10px] uppercase tracking-wider text-brand-dust font-medium">Protected</span>
                          ) : user.role === 'admin' ? (
                            <button
                              onClick={() => handleActionClick(user, 'customer')}
                              className="border border-[#8D4237]/20 hover:border-[#8D4237] text-[#8D4237] py-1 px-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                            >
                              Demote to Customer
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActionClick(user, 'admin')}
                              className="bg-brand-espresso hover:bg-brand-dust text-brand-cream py-1 px-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                            >
                              Promote to Admin
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
        </div>
      )}

      {/* 3. Current Admins List */}
      <div className="bg-white rounded-soft border border-brand-dust/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-brand-dust/10">
          <h2 className="font-serif text-base text-brand-espresso">Current Admins</h2>
          <p className="text-xs text-brand-dust font-light leading-relaxed">
            All users possessing administrative or system-level clearance roles.
          </p>
        </div>

        {/* Loading State */}
        {isLoadingAdmins && (
          <div className="p-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
            <p className="text-xs text-brand-dust font-light tracking-wider">Loading complete admin list...</p>
          </div>
        )}

        {/* Error State */}
        {adminsError && !isLoadingAdmins && (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <span className="text-xl">⚠️</span>
            <p className="text-xs text-brand-dust leading-relaxed">{adminsError}</p>
            <button
              onClick={() => fetchAdmins(true)}
              className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-4 py-2 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all"
            >
              Retry Load
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingAdmins && !adminsError && admins.length === 0 && (
          <p className="p-16 text-center text-xs text-brand-dust font-light italic">
            No administrative accounts exist. Please check setup.
          </p>
        )}

        {/* Admins Table */}
        {!isLoadingAdmins && !adminsError && admins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-cream/40 border-b border-brand-dust/10 text-brand-espresso font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4 text-center">Clearance Level</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dust/10 text-brand-espresso font-light">
                {admins.map((user) => {
                  const userIdStr = (user.id || user._id)?.toString();
                  const currentUserIdStr = currentUser?.id?.toString();
                  const isSelf = userIdStr === currentUserIdStr;

                  return (
                    <tr key={userIdStr} className="hover:bg-brand-cream/10 transition-colors">
                      <td className="py-3.5 px-4 font-normal text-sm font-serif">{user.name}</td>
                      <td className="py-3.5 px-4">{user.email}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center">
                          {isSelf ? (
                            <span className="text-[10px] text-brand-dust font-light italic">Current Account</span>
                          ) : user.role === 'super_admin' ? (
                            <span className="text-[10px] uppercase tracking-wider text-brand-dust font-medium">Protected</span>
                          ) : (
                            <button
                              onClick={() => handleActionClick(user, 'customer')}
                              className="border border-red-200 hover:border-[#8D4237] text-[#8D4237] hover:bg-red-50/10 py-1 px-3 rounded-soft text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 cursor-pointer"
                            >
                              Demote to Customer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {actionTarget && (
        <div className="fixed inset-0 bg-brand-espresso/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-luxury border border-brand-dust/15 shadow-xl animate-fade-in space-y-6">
            
            <div className="space-y-2 text-brand-espresso">
              <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold block">
                {actionTarget.targetRole === 'admin' ? 'Promote Account' : 'Demote Account'}
              </span>
              <h3 className="font-serif text-2xl">Confirm Role Update</h3>
              <p className="text-xs text-brand-dust font-light leading-relaxed">
                Are you sure you want to change the role of <span className="font-semibold text-brand-espresso">{actionTarget.user.name}</span> ({actionTarget.user.email}) to <span className="font-semibold text-brand-espresso uppercase">{actionTarget.targetRole}</span>?
              </p>
            </div>

            {/* Warning callout based on target role */}
            {actionTarget.targetRole === 'admin' ? (
              <div className="bg-brand-espresso/5 border border-brand-espresso/10 p-3.5 rounded-soft text-xs text-brand-espresso font-normal leading-relaxed">
                This will grant <span className="font-semibold">{actionTarget.user.name}</span> admin access to the dashboard. They will be able to manage inventory, outfits, process refunds, and view bookings.
              </div>
            ) : (
              <div className="bg-[#8D4237]/10 border border-[#8D4237]/20 p-3.5 rounded-soft text-xs text-[#8D4237] font-medium leading-relaxed">
                This will revoke all administrative privileges for <span className="font-semibold">{actionTarget.user.name}</span>. They will no longer be able to log in to this dashboard or access any management options.
              </div>
            )}

            {actionError && (
              <p className="text-xs text-[#8D4237] font-medium leading-normal animate-fade-in">
                ⚠️ {actionError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() => setActionTarget(null)}
                className="border border-brand-dust/20 text-brand-dust hover:text-brand-espresso hover:border-brand-espresso px-4 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer"
              >
                Never Mind
              </button>
              <button
                type="button"
                disabled={isSavingAction}
                onClick={handleActionConfirm}
                className="bg-brand-espresso hover:bg-brand-dust text-brand-cream disabled:opacity-50 px-5 py-2.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm cursor-pointer"
              >
                {isSavingAction ? 'Saving...' : 'Confirm Update'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
