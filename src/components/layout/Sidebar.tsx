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
import { BRANDING } from '../../constants/branding';

const navSections = [
  {
    title: 'COMMAND CENTER',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'EE Project Command Center' },
      { to: '/operations', icon: Activity, label: 'Ops Center' },
      { to: '/problems', icon: AlertTriangle, label: 'Problems' },
    ],
  },
  {
    title: 'PROJECTS',
    icon: FolderOpen,
    items: [
      { to: '/projects/all', icon: FolderOpen, label: 'All Projects' },
      { to: '/projects/agreement-boq', icon: FileText, label: 'Agreement & BOQ' },
      { to: '/projects/details', icon: FileStack, label: 'Project Details' },
      { to: '/projects/progress', icon: TrendingUp, label: 'Progress' },
      { to: '/design', icon: Brain, label: 'AI Design' },
      { to: '/inventory', icon: Package, label: 'Inventory' },
    ],
  },
  {
    title: 'FIELD EXECUTION',
    icon: HardHat,
    items: [
      { to: '/field/daily-progress', icon: Camera, label: 'Daily Progress' },
      { to: '/field/labour', icon: Users, label: 'Labour' },
      { to: '/field/materials', icon: Package, label: 'Materials' },
      { to: '/field/equipment', icon: Truck, label: 'Equipment' },
      { to: '/field/survey-quantity', icon: ScanLine, label: 'Survey & Quantity' },
      { to: '/workers', icon: Users, label: 'Workforce' },
      { to: '/diesel', icon: Truck, label: 'Diesel' },
    ],
  },
  {
    title: 'QUALITY & INSPECTION',
    icon: ClipboardCheck,
    items: [
      { to: '/quality/inspections', icon: ClipboardCheck, label: 'Inspections' },
      { to: '/quality/material-tests', icon: Beaker, label: 'Material Tests' },
      { to: '/quality/tpa', icon: ClipboardCheck, label: 'TPA' },
      { to: '/quality/drawing-compare', icon: ScanLine, label: 'Drawing Compare' },
      { to: '/tender-lifecycle', icon: FileStack, label: 'Tender Lifecycle' },
    ],
  },
  {
    title: 'CONTRACTS & FINANCE',
    icon: IndianRupee,
    items: [
      { to: '/finance/bg-tracker', icon: Banknote, label: 'BG Tracker' },
      { to: '/finance/sd-tracker', icon: Shield, label: 'SD Tracker' },
      { to: '/finance/ra-bills', icon: FileBarChart, label: 'RA Bills' },
      { to: '/finance/payments', icon: IndianRupee, label: 'Payments' },
      { to: '/finance/material-advance', icon: Package, label: 'Material Advance' },
      { to: '/recovery/dashboard', icon: ClipboardCheck, label: 'Recovery' },
      { to: '/budget-progress', icon: TrendingUp, label: 'Budget vs Progress' },
    ],
  },
  {
    title: 'DELAYS & CLAIMS',
    icon: FileX,
    items: [
      { to: '/delays/hindrance', icon: FileX, label: 'Hindrance Register' },
      { to: '/delays/weather', icon: CloudRain, label: 'Weather' },
      { to: '/delays/extensions', icon: MessageSquare, label: 'Extensions' },
      { to: '/delays/dlp', icon: FileX, label: 'DLP' },
      { to: '/maintenance', icon: HardHat, label: 'Maintenance' },
      { to: '/disputes', icon: Scale, label: 'Dispute Resolution' },
    ],
  },
  {
    title: 'GIS & MONITORING',
    icon: MapPin,
    items: [
      { to: '/monitoring/gis-map', icon: MapPin, label: 'GIS Map' },
      { to: '/monitoring/drone-surveys', icon: Plane, label: 'Drone Surveys' },
      { to: '/whatsapp-bot', icon: MessageSquare, label: 'WhatsApp Bot' },
    ],
  },
  {
    title: 'REPORTS',
    icon: BarChart2,
    items: [
      { to: '/reports/financial-progress', icon: IndianRupee, label: 'Financial Progress' },
      { to: '/reports/physical-progress', icon: BarChart2, label: 'Physical Progress' },
      { to: '/reports/analytics', icon: FileBarChart, label: 'Analytics' },
      { to: '/reports', icon: BarChart2, label: 'Reports' },
      { to: '/govtrack', icon: Landmark, label: 'GovTrack Pro' },
    ],
  },
  {
    title: 'ENTERPRISE',
    icon: Landmark,
    items: [
      { to: '/enterprise', icon: Landmark, label: 'Enterprise Dashboard' },
      { to: '/enterprise/start-pilot', icon: ClipboardCheck, label: 'Assignment Setup' },
      { to: '/enterprise/pilot-guide', icon: FileText, label: 'Operations Guide' },
      { to: '/enterprise/assign-project', icon: FolderOpen, label: 'Assign Project' },
      { to: '/enterprise/setup', icon: Settings, label: 'Workspace Setup' },
      { to: '/enterprise/billing', icon: IndianRupee, label: 'Licensing' },
      { to: '/enterprise/onboarding', icon: Users, label: 'Onboarding' },
      { to: '/enterprise/access', icon: Shield, label: 'Access Control' },
    ],
  },
  {
    title: 'SYSTEM',
    icon: Settings,
    items: [
      { to: '/about/nirman-ai', icon: Landmark, label: 'About NIRMAN AI' },
      { to: '/help/user-manual', icon: FileText, label: 'Help / User Manual' },
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
      { to: '/admin/activity', icon: Activity, label: 'Activity Logs' },
    ],
  },
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
        {navSections.map(({ title, icon: SectionIcon, items }) => (
          <div key={title}>
            {!collapsed && (
              <div className="mt-4 mb-2 mx-4 flex items-center gap-1.5 first:mt-0">
                <SectionIcon size={10} style={{ color: '#D8B15A' }} />
                <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: '#D8B15A' }}>{title}</span>
              </div>
            )}
            {collapsed && <div className="my-2 mx-2 h-px bg-[#D8B15A]/20" />}
            {items.map(({ to, icon: Icon, label }) => (
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
          </div>
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

