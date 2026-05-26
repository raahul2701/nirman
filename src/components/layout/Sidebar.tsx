import { memo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Users, Plane, Brain,
  Package, FolderOpen, BarChart2, Settings, LogOut,
  ChevronLeft, ChevronRight, Zap, HardHat, Truck,
  Landmark, Camera, IndianRupee, ClipboardCheck, FileBarChart,
  Shield, Banknote, ScanLine, Beaker, FileStack, FileText, CloudRain,
  MessageSquare, MapPin, TrendingUp, FileX, Scale, Activity
} from '../../lib/icons';
import { useAuth } from '../../contexts/useAuth';
import { featureFlags } from '../../lib/featureFlags';
import { BRANDING } from '../../constants/branding';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/operations', icon: Activity, label: 'Ops Center' },
  { to: '/problems', icon: AlertTriangle, label: 'Problems' },
  { to: '/workers', icon: Users, label: 'Workforce' },
  { to: '/surveys', icon: Plane, label: 'Drone Surveys' },
  { to: '/design', icon: Brain, label: 'AI Design' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/help/user-manual', icon: FileText, label: 'Help / User Manual' },
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

const advancedItems = [
  ...(featureFlags.blacklist ? [{ to: '/blacklist', icon: Shield, label: 'Blacklist DB' }] : []),
  { to: '/bank-guarantees', icon: Banknote, label: 'BG & SD Tracker' },
  { to: '/drawing-compare', icon: ScanLine, label: 'Drawing Compare' },
  { to: '/material-tests', icon: Beaker, label: 'Material Tests' },
  { to: '/tender-lifecycle', icon: FileStack, label: 'Tender Lifecycle' },
  { to: '/dlp-tracker', icon: FileX, label: 'DLP Tracker' },
  { to: '/weather-log', icon: CloudRain, label: 'Weather Logger' },
  { to: '/extensions', icon: MessageSquare, label: 'Extensions' },
  { to: '/whatsapp-bot', icon: MessageSquare, label: 'WhatsApp Bot' },
  { to: '/gis-map', icon: MapPin, label: 'GIS Map' },
  { to: '/budget-progress', icon: TrendingUp, label: 'Budget vs Progress' },
  { to: '/tpa-portal', icon: ClipboardCheck, label: 'TPA Portal' },
  { to: '/hindrance-register', icon: FileX, label: 'Hindrance Register' },
  ...(featureFlags.disputes ? [{ to: '/disputes', icon: Scale, label: 'Dispute Resolution' }] : []),
];

const contractorItems = [
  { to: '/diesel', icon: Truck, label: 'Diesel' },
  { to: '/materials/reconciliation', icon: Package, label: 'Materials' },
  { to: '/labour/payments', icon: IndianRupee, label: 'Labour' },
  { to: '/recovery/dashboard', icon: ClipboardCheck, label: 'Recovery' },
  { to: '/maintenance', icon: HardHat, label: 'Maintenance' },
  { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
  { to: '/admin/activity', icon: Activity, label: 'Activity Logs' },
];

const enterpriseItems = [
  ...(featureFlags.eeWorkspaceIsolation ? [{ to: '/enterprise', icon: Landmark, label: 'Hierarchy' }] : []),
  ...(featureFlags.eeWorkspaceIsolation || featureFlags.pilotMode ? [{ to: '/enterprise/start-pilot', icon: ClipboardCheck, label: 'Start Pilot' }] : []),
  ...(featureFlags.eeWorkspaceIsolation || featureFlags.pilotMode ? [{ to: '/enterprise/pilot-guide', icon: FileText, label: 'Pilot Guide' }] : []),
  ...(featureFlags.eeWorkspaceIsolation || featureFlags.pilotMode ? [{ to: '/enterprise/assign-project', icon: FolderOpen, label: 'Assign Project' }] : []),
  ...(featureFlags.pilotMode ? [{ to: '/enterprise/pilot', icon: ClipboardCheck, label: 'Pilot Admin' }] : []),
  ...(featureFlags.googleDrivePerEe ? [{ to: '/enterprise/setup', icon: Settings, label: 'Workspace Setup' }] : []),
  ...(featureFlags.contractorBilling ? [{ to: '/enterprise/billing', icon: IndianRupee, label: 'Licensing' }] : []),
  ...(featureFlags.contractorBilling ? [{ to: '/enterprise/onboarding', icon: Users, label: 'Onboarding' }] : []),
  ...(featureFlags.eeWorkspaceIsolation ? [{ to: '/enterprise/access', icon: Shield, label: 'Access Control' }] : []),
];

function SidebarComponent() {
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
      style={{ background: 'linear-gradient(180deg, var(--sidebar) 0%, #041D17 100%)', borderRight: '1px solid rgba(216,177,90,0.24)' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-[#D8B15A]/20 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white p-1" style={{ border: '1px solid rgba(216,177,90,0.5)' }}>
          <img src={BRANDING.LOGO_MARK_PATH} alt="ARSPL" className="h-full w-full object-contain" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-black text-sm tracking-wide">NIRMAN AI</p>
            <p className="text-[8px] tracking-[0.15em] font-semibold text-[#D8B15A]">by ARSPL</p>
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
                  ? 'bg-[#C89B3C]/15 text-[#F6D878] border border-[#C89B3C]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/7'
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
            <Landmark size={10} style={{ color: '#D8B15A' }} />
            <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: '#D8B15A' }}>GOVTRACK PRO</span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 h-px bg-[#D8B15A]/20" />}
        {govTrackItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-[#D8B15A]/14 text-[#F6D878] border border-[#D8B15A]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/7'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}

        {/* Advanced Features Section */}
        {!collapsed && (
          <div className="mt-4 mb-2 mx-4 flex items-center gap-1.5">
            <Zap size={10} style={{ color: '#D8B15A' }} />
            <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: '#D8B15A' }}>ADVANCED FEATURES</span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 h-px bg-[#D8B15A]/20" />}
        {advancedItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-[#C89B3C]/15 text-[#F6D878] border border-[#C89B3C]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/7'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}

        {!collapsed && (
          <div className="mt-4 mb-2 mx-4 flex items-center gap-1.5">
            <HardHat size={10} style={{ color: '#D8B15A' }} />
            <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: '#D8B15A' }}>FIELD OPS</span>
          </div>
        )}
        {contractorItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-[#C89B3C]/15 text-[#F6D878] border border-[#C89B3C]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/7'
              } ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}

        {enterpriseItems.length > 0 && !collapsed && (
          <div className="mt-4 mb-2 mx-4 flex items-center gap-1.5">
            <Landmark size={10} style={{ color: '#D8B15A' }} />
            <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: '#D8B15A' }}>ENTERPRISE</span>
          </div>
        )}
        {enterpriseItems.length > 0 && collapsed && <div className="my-2 mx-2 h-px bg-[#D8B15A]/20" />}
        {enterpriseItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-[#D8B15A]/14 text-[#F6D878] border border-[#D8B15A]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/7'
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
      <div className="border-t border-[#D8B15A]/20 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-7 h-7 rounded-full bg-[#C89B3C]/20 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="text-[#F6D878] text-xs font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-white/55 text-[10px] truncate capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-white/60 hover:text-red-300 hover:bg-red-400/10 transition-all text-sm ${collapsed ? 'justify-center w-full' : 'flex-1'}`}
            title="Sign out"
          >
            <LogOut size={15} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/7 transition-all"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* AI badge */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(216,177,90,0.24)' }}>
            <Zap size={10} style={{ color: '#D8B15A' }} />
            <span className="text-[9px] font-medium" style={{ color: '#F6D878' }}>ARSPL Command</span>
          </div>
        </div>
      )}
    </aside>
  );
}

export const Sidebar = memo(SidebarComponent);
