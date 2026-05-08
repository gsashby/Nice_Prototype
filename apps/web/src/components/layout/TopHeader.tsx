'use client';
import { Bell, HelpCircle, LayoutGrid } from 'lucide-react';
import { useAlertsStore } from '@/stores/alerts-store';

export default function TopHeader() {
  const alerts = useAlertsStore((s) => s.alerts);
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <header className="flex h-12 items-center justify-between px-4 z-50" style={{ background: '#0B2D55' }}>
      {/* Left */}
      <div className="flex items-center gap-2">
        <button className="flex h-[34px] w-[34px] items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <LayoutGrid className="h-[17px] w-[17px]" />
        </button>
        <div className="h-5 w-px bg-white/15" />
        <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 13 }}>Admin</span>
      </div>

      {/* Center logo */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-white font-bold" style={{ fontSize: 17, letterSpacing: '-.3px' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7" />
        </svg>
        <span>CXone Mpower</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <button className="relative flex h-[34px] w-[34px] items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <Bell className="h-[17px] w-[17px]" />
          {unacknowledged > 0 && (
            <span className="absolute right-[3px] top-[3px] flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[#0B2D55]">
              {unacknowledged}
            </span>
          )}
        </button>
        <button className="flex h-[34px] w-[34px] items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <HelpCircle className="h-[17px] w-[17px]" />
        </button>
        <div className="h-5 w-px bg-white/15" />
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer">
          <div className="text-right">
            <div className="text-[12.5px] font-semibold text-white leading-tight">Gerald Ashby</div>
            <div className="text-[10.5px] text-white/60 leading-tight">Director, Product Management</div>
          </div>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-blue-700 text-white text-[11px] font-bold flex-shrink-0">
            GA
          </div>
        </button>
      </div>
    </header>
  );
}
