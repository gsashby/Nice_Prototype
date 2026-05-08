'use client';
import { Bell, Settings, User } from 'lucide-react';
import { useAlertsStore } from '@/stores/alerts-store';

export default function TopHeader() {
  const alerts = useAlertsStore((s) => s.alerts);
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
      <div className="text-sm text-gray-400">
        Enterprise AI Governance Platform
      </div>
      <div className="flex items-center gap-3">
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
          {unacknowledged > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unacknowledged}
            </span>
          )}
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <Settings className="h-5 w-5" />
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600">
            <User className="h-4 w-4 text-white" />
          </div>
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
}
