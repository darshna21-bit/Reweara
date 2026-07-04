import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminDashboardStats } from '../../api/bookings';

/**
 * AdminOverview Dashboard Landing Page
 * Greets administrators and presents a dense grid of primary management tiles.
 * The "Manage Admins" tile is role-restricted to super_admin.
 */
export default function AdminOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getAdminDashboardStats();
        if (res && res.success) {
          setStats(res.data);
        } else {
          throw new Error('Failed to retrieve statistics');
        }
      } catch (err) {
        console.error('Error fetching admin dashboard statistics:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Dense, task-oriented navigation tile config
  const managementTiles = [
    {
      title: 'Outfits',
      path: '/admin/outfits',
      description: 'Manage garment registry, edit descriptions, rent pricing, and toggle catalog visibility.',
      icon: '👗',
      roleRestricted: false,
    },
    {
      title: 'Bookings',
      path: '/admin/bookings',
      description: 'Monitor rental schedules, verify security deposits, and coordinate delivery/return logistics.',
      icon: '📅',
      roleRestricted: false,
    },
    {
      title: 'Refunds',
      path: '/admin/refunds',
      description: 'Audit damage claims, authorize security deposits releases, and process customer refunds.',
      icon: '💳',
      roleRestricted: false,
    },
    {
      title: 'Manage Admins',
      path: '/admin/admins',
      description: 'Audit system activity logs, register administrative staff, and rotate security role permissions.',
      icon: '🔐',
      roleRestricted: true, // Restricted to super_admin
    },
  ];

  // Filter tiles based on user role authorization
  const visibleTiles = managementTiles.filter(tile => {
    if (tile.roleRestricted) {
      return user && user.role === 'super_admin';
    }
    return true;
  });

  const renderStat = (value, unit) => {
    if (loading) return <span className="text-brand-dust/60 animate-pulse">...</span>;
    if (error || value === undefined || value === null) return <span className="text-brand-dust">&mdash;</span>;
    return `${value} ${unit}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Greeting Banner */}
      <div className="border-b border-brand-dust/10 pb-4">
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-brand-espresso">
          Welcome back, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-xs text-brand-dust tracking-wider uppercase mt-1.5 font-medium">
          Dashboard Overview &bull; Role: <span className="text-brand-gold font-bold">{user?.role}</span>
        </p>
      </div>

      {/* Quick Stats Placeholder Grid (Utilitarian dashboard feature) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-soft border border-brand-dust/10">
          <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold">Active Catalog</span>
          <div className="text-2xl font-serif text-brand-espresso mt-1">
            {renderStat(stats?.activeCatalog, 'Items')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-soft border border-brand-dust/10">
          <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold">Active Rentals</span>
          <div className="text-2xl font-serif text-brand-espresso mt-1">
            {renderStat(stats?.activeRentals, 'Orders')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-soft border border-brand-dust/10">
          <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold">Pending Returns</span>
          <div className="text-2xl font-serif text-brand-espresso mt-1">
            {renderStat(stats?.pendingReturns, 'Garments')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-soft border border-brand-dust/10">
          <span className="text-[10px] uppercase tracking-widest text-brand-dust font-semibold">Pending Refunds</span>
          <div className="text-2xl font-serif text-brand-espresso mt-1">
            {renderStat(stats?.pendingRefunds, 'Releases')}
          </div>
        </div>
      </div>

      {/* Clickable Feature Tile Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-brand-dust font-bold">
          Quick Actions & Directory
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {visibleTiles.map((tile) => (
            <Link 
              key={tile.title}
              to={tile.path}
              className="bg-white p-5 rounded-soft border border-brand-dust/10 hover:border-brand-espresso shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group transform hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <span className="text-3xl block" role="img" aria-label={tile.title}>
                  {tile.icon}
                </span>
                <div>
                  <h3 className="font-serif text-lg text-brand-espresso group-hover:text-brand-dust transition-colors">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-brand-dust/90 leading-relaxed font-light mt-1.5">
                    {tile.description}
                  </p>
                </div>
              </div>
              
              <div className="text-[10px] uppercase tracking-wider font-semibold text-brand-espresso group-hover:text-brand-dust pt-4 flex items-center gap-1 mt-auto">
                Open Manager <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
