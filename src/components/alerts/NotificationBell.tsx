import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export function NotificationBell({ onClick }: { onClick: () => void }) {
  const { unreadCount } = useNotifications();

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-10 h-10 rounded-2xl flex items-center justify-center border border-[#1F1F2E] hover:bg-white/5 transition-colors"
      aria-label="Notifications"
    >
      <Bell size={18} className="text-[#A0A0A0]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF6B00] px-1.5 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
