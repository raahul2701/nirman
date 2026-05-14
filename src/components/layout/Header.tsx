import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from '../../lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const typeColors: Record<string, string> = {
    info: '#00D4AA',
    warning: '#FF6B00',
    error: '#ef4444',
    success: '#22c55e',
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#1F1F2E]" style={{ background: '#0D0D0D' }}>
      <div>
        <h1 className="text-white font-bold text-lg leading-tight">{title}</h1>
        {subtitle && <p className="text-[#606060] text-xs">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
            style={{ border: '1px solid #1F1F2E' }}
          >
            <Bell size={16} className="text-[#A0A0A0]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#FF6B00' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
                <span className="text-white font-semibold text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-[#FF6B00] hover:text-white transition-colors">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-[#606060] hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-[#606060] text-sm">No notifications</div>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`px-4 py-3 border-b border-[#1F1F1F] cursor-pointer hover:bg-white/3 transition-all ${!n.read ? 'bg-white/2' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? 'transparent' : typeColors[n.type] || '#FF6B00' }} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${n.read ? 'text-[#A0A0A0]' : 'text-white'}`}>{n.title}</p>
                          <p className="text-[11px] text-[#606060] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-[#404040] mt-1">{formatDistanceToNow(n.created_at)}</p>
                        </div>
                        {n.read && <Check size={10} className="text-[#404040] mt-1 flex-shrink-0" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.2)' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover" />
          ) : (
            <span className="text-[#FF6B00] text-sm font-bold">{profile?.full_name?.charAt(0) || 'U'}</span>
          )}
        </div>
      </div>
    </header>
  );
}
