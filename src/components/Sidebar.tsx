import React from 'react';
import { LayoutDashboard, Users, Sliders, Settings, LogOut, ClipboardCheck, CalendarClock } from 'lucide-react';
import type { StaffMember } from '../types';
import ShiftWidget from './ShiftWidget';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'user_management' | 'checkin' | 'shift_management';

interface SidebarProps {
  currentUser: StaffMember;
  activeMenu: ActiveMenu;
  onNavigate: (menu: ActiveMenu) => void;
  totalLeadsCount: number;
  checkinCount: number;
  onLogout: () => void;
  shiftActive?: boolean;
  onShiftChange?: (active: boolean) => void;
}

export default function Sidebar({ currentUser, activeMenu, onNavigate, totalLeadsCount, checkinCount, onLogout, shiftActive, onShiftChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Главная', icon: LayoutDashboard },
    { id: 'leads' as const, label: 'Записи', icon: Users, badge: totalLeadsCount },
    ...(currentUser.role === 'admin' ? [{ id: 'checkin' as const, label: 'Визиты', icon: ClipboardCheck, badge: checkinCount > 0 ? checkinCount : undefined }] : []),
    ...(currentUser.role === 'admin' ? [{ id: 'salary' as const, label: 'Зарплаты', icon: Sliders }] : []),
    ...(currentUser.role === 'admin' ? [{ id: 'shift_management' as const, label: 'Смены', icon: CalendarClock }] : []),
    ...(currentUser.role === 'admin' ? [{ id: 'user_management' as const, label: 'Настройки', icon: Settings }] : []),
  ];

  return (
    <aside className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-neutral-100 shrink-0 flex flex-col justify-between z-40 shadow-sm lg:sticky lg:top-0 lg:h-screen">
      <div>
        <div className="p-6 border-b border-neutral-100/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <text x="14" y="21" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="900" fill="white" textAnchor="middle">В</text>
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-display font-bold text-neutral-950 uppercase tracking-widest leading-none">Виви Маркетинг</span>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-white/40 backdrop-blur-xs border border-white/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center font-display font-semibold text-xs text-white shadow-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-neutral-950 truncate leading-none">{currentUser.name}</h4>
                {currentUser.role === 'admin' && (
                  <p className="text-[9px] text-neutral-500 mt-1.5 leading-none font-medium">Администратор</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shift widget — managers only */}
        {currentUser.role === 'manager' && (
          <div className="pt-4 border-b border-neutral-100/40 pb-4">
            <ShiftWidget managerName={currentUser.name} onShiftChange={onShiftChange} />
          </div>
        )}

        <nav className="p-5 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 relative group cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-indigo-600 bg-indigo-50/55 border border-indigo-100/50 shadow-sm pl-4.5 font-extrabold'
                    : 'text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50/20 pl-3.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors duration-150 ${isActive ? 'text-indigo-600' : 'text-neutral-400 group-hover:text-indigo-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-indigo-600 text-white text-[8px] font-bold px-2.5 py-1 rounded-lg leading-none shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-5 border-t border-neutral-100/40">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/40 hover:bg-neutral-950 hover:text-white text-neutral-600 border border-neutral-200/60 text-[10.5px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </aside>
  );
}
