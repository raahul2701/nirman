import React from 'react';
import { Card } from '../components/ui/Card';
import { MessageSquare } from 'lucide-react';

export const WhatsAppBotPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Bot</h1>
          <p className="text-gray-400">Automate notifications, attendance updates and issue alerts through WhatsApp.</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Bot Status</h2>
        <p className="text-gray-300 mb-4">
          Use this page to configure automatic message templates for daily logs, approvals, reminders, and emergency alerts.
        </p>
      </Card>
    </div>
  );
};