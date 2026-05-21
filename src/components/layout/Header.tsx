import { memo, useEffect, useMemo, useState, useRef } from 'react';
import { Bell, X, Check } from '../../lib/icons';
import { useAuth } from '../../contexts/useAuth';
import { useNotifications } from '../../contexts/useNotifications';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { isOnline, watchConnectivity } from '../../services/offline/connectivity';
import { formatDistanceToNow } from '../../lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function HeaderComponent({ title, subtitle }: HeaderProps) {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const { pendingSync } = useOfflineSync();
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = watchConnectivity(setOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const typeColors = useMemo(
    () => ({
      info: '#2F6B9A',
      warning: '#C89B3C',
      error: '#B42318',
      success: '#0B8B7D',
    }),
    []
  );

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#DDD4B9]" style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(12px)' }}>
      <div>
        <h1 className="text-[#12332D] font-bold text-lg leading-tight">{title}</h1>
        {subtitle && <p className="text-[#6C7568] text-xs">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className={`rounded-full px-3 py-1 text-[11px] uppercase font-semibold ${online ? 'bg-emerald-700/10 text-emerald-800' : 'bg-rose-500/10 text-rose-700'}`}>
          {online ? 'Online' : 'Offline Mode Active'}
        </div>
        {pendingSync > 0 && (
          <div className="rounded-full px-3 py-1 text-[11px] uppercase font-semibold bg-[#C89B3C]/15 text-[#6B5A1E]">
            Sync Pending ({pendingSync})
          </div>
        )}

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-[#005F56]/5"
            style={{ border: '1px solid #DDD4B9' }}
          >
            <Bell size={16} className="text-[#6C7568]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-[#12332D]" style={{ background: '#C89B3C' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-80 rounded-lg overflow-hidden shadow-command z-50"
              style={{ background: '#FFFFFF', border: '1px solid #DDD4B9' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDD4B9]">
                <span className="text-[#12332D] font-semibold text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-[#005F56] hover:text-[#6B5A1E] transition-colors">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-[#6C7568] hover:text-[#005F56]">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-[#6C7568] text-sm">No notifications</div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`px-4 py-3 border-b border-[#EFE8D4] cursor-pointer hover:bg-[#005F56]/5 transition-all ${!n.read ? 'bg-[#C89B3C]/5' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? 'transparent' : typeColors[n.type] || '#C89B3C' }} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${n.read ? 'text-[#6C7568]' : 'text-[#12332D]'}`}>{n.title}</p>
                          <p className="text-[11px] text-[#6C7568] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-[#9A9F93] mt-1">{formatDistanceToNow(n.created_at)}</p>
                        </div>
                        {n.read && <Check size={10} className="text-[#9A9F93] mt-1 flex-shrink-0" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,155,60,0.18)', border: '1px solid rgba(200,155,60,0.35)' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <span className="text-[#005F56] text-sm font-bold">{profile?.full_name?.charAt(0) || 'U'}</span>
          )}
        </div>
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
