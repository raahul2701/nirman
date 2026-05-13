import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Users, Plane, Brain,
  Package, FolderOpen, BarChart2, Settings, LogOut,
  ChevronLeft, ChevronRight, Zap, HardHat,
  Landmark, Camera, IndianRupee, ClipboardCheck, FileBarChart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/problems', icon: AlertTriangle, label: 'Problems' },
  { to: '/workers', icon: Users, label: 'Workforce' },
  { to: '/surveys', icon: Plane, label: 'Drone Surveys' },
  { to: '/design', icon: Brain, label: 'AI Design' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const govTrackItems = [
  { to: '/govtrack', icon: Landmark, label: 'Gov Dashboard' },
  { to: '/govtrack/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/govtrack/upload', icon: Camera, label: 'Upload Work' },
  { to: '/govtrack/payments', icon: IndianRupee, label: 'Payments' },
  { to: '/govtrack/inspect', icon: ClipboardCheck, label: 'Inspections' },
  { to: '/govtrack/reports', icon: FileBarChart, label: 'Reports' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ background: 'linear-gradient(180deg, #111118 0%, #0D0D0D 100%)', borderRight: '1px solid #1F1F2E' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-[#1F1F2E] ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C00)' }}>
          <HardHat size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-black text-sm tracking-wide">NIRMAN AI</p>
            <p className="text-[8px] tracking-[0.15em] font-semibold text-white/70">by ARSPL</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/20'
                  : 'text-[#808080] hover:text-white hover:bg-white/5'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}

        {/* GovTrack Pro Section */}
        {!collapsed && (
          <div className="mt-4 mb-2 mx-4 flex items-center gap-1.5">
            <Landmark size={10} style={{ color: '#00D4AA' }} />
            <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: '#00D4AA' }}>GOVTRACK PRO</span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 h-px bg-[#1F1F2E]" />}
        {govTrackItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20'
                  : 'text-[#808080] hover:text-white hover:bg-white/5'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-[#1F1F2E] p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-7 h-7 rounded-full bg-[#FF6B00]/20 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="text-[#FF6B00] text-xs font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[#808080] text-[10px] truncate capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[#808080] hover:text-red-400 hover:bg-red-400/10 transition-all text-sm ${collapsed ? 'justify-center w-full' : 'flex-1'}`}
            title="Sign out"
          >
            <LogOut size={15} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-[#808080] hover:text-white hover:bg-white/5 transition-all"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* AI badge */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.15)' }}>
            <Zap size={10} style={{ color: '#00D4AA' }} />
            <span className="text-[9px] font-medium" style={{ color: '#00D4AA' }}>Building India</span>
          </div>
        </div>
      )}
    </aside>
  );
}
